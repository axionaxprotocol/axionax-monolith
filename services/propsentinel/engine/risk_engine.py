"""Risk evaluation engine — the core brain of Propsentinel.

Evaluates every incoming telemetry snapshot against the account's active
risk profile. If a threshold is breached, publishes a kill-switch command
to Redis and logs the event to PostgreSQL.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal

import asyncpg

from engine.redis_broker import broker
from engine.db import get_risk_profile, get_peaks, upsert_peaks, insert_risk_event
from models.payloads import (
    KillReason,
    KillAction,
    KillSwitchCommand,
    TelemetryPayload,
    TriggerType,
)


async def evaluate(
    pool: asyncpg.Pool,
    telemetry: TelemetryPayload,
    account_id: str,
) -> KillSwitchCommand | None:
    """Run the risk rule chain. Returns a KillSwitchCommand if breached, else None."""

    profile = await get_risk_profile(pool, account_id)
    if profile is None:
        return None  # no active risk profile — nothing to enforce

    equity = telemetry.portfolio.equity
    peaks = await get_peaks(pool, account_id)

    # Initialise peaks if first-ever snapshot
    all_time_peak = Decimal(str(peaks["peak_equity"])) if peaks else equity
    daily_peak = Decimal(str(peaks["daily_peak_equity"])) if peaks else equity

    # Update peaks if new high
    new_all_time = max(all_time_peak, equity)
    new_daily = max(daily_peak, equity)
    await upsert_peaks(pool, account_id, str(new_all_time), str(new_daily))

    # --- Check MAX drawdown (all-time) ---
    max_dd_pct = profile.get("max_drawdown_pct")
    max_dd_abs = profile.get("max_drawdown_abs")

    if max_dd_pct is not None:
        max_dd_pct = Decimal(str(max_dd_pct))
        dd_pct = (new_all_time - equity) / new_all_time * 100
        if dd_pct >= max_dd_pct:
            return await _trigger(
                pool, account_id, TriggerType.max_drawdown,
                profile, max_dd_pct, dd_pct, equity, new_all_time,
            )

    if max_dd_abs is not None:
        max_dd_abs = Decimal(str(max_dd_abs))
        dd_abs = new_all_time - equity
        if dd_abs >= max_dd_abs:
            return await _trigger(
                pool, account_id, TriggerType.max_drawdown,
                profile, max_dd_abs, dd_abs, equity, new_all_time,
            )

    # --- Check DAILY drawdown ---
    daily_dd_pct = profile.get("daily_drawdown_pct")
    daily_dd_abs = profile.get("daily_drawdown_abs")

    if daily_dd_pct is not None:
        daily_dd_pct = Decimal(str(daily_dd_pct))
        daily_dd = (new_daily - equity) / new_daily * 100 if new_daily > 0 else Decimal("0")
        if daily_dd >= daily_dd_pct:
            return await _trigger(
                pool, account_id, TriggerType.daily_drawdown,
                profile, daily_dd_pct, daily_dd, equity, new_daily,
            )

    if daily_dd_abs is not None:
        daily_dd_abs = Decimal(str(daily_dd_abs))
        daily_dd_abs_val = new_daily - equity
        if daily_dd_abs_val >= daily_dd_abs:
            return await _trigger(
                pool, account_id, TriggerType.daily_drawdown,
                profile, daily_dd_abs, daily_dd_abs_val, equity, new_daily,
            )

    return None


async def _trigger(
    pool: asyncpg.Pool,
    account_id: str,
    trigger_type: TriggerType,
    profile: dict,
    threshold: Decimal,
    actual: Decimal,
    equity: Decimal,
    peak: Decimal,
) -> KillSwitchCommand:
    """Log the breach, publish kill switch, return the command."""

    drawdown_pct = round((peak - equity) / peak * 100, 2) if peak > 0 else Decimal("0")

    event_id = await insert_risk_event(
        pool,
        account_id=account_id,
        trigger_type=trigger_type.value,
        rule_detail=json.dumps({"profile": {k: str(v) for k, v in profile.items() if v is not None}}),
        threshold=str(threshold),
        actual_value=str(actual),
        equity_at_event=str(equity),
        peak_at_event=str(peak),
        kill_signal_sent=True,
    )

    cmd = KillSwitchCommand(
        issued_at=datetime.now(timezone.utc),
        account_number="",  # filled by caller
        reason=KillReason(
            type=trigger_type,
            threshold=threshold,
            actual=actual,
            peak_equity=peak,
            current_equity=equity,
            drawdown_pct=drawdown_pct,
        ),
        action=KillAction(
            close_all_positions=True,
            disable_auto_trading=True,
            message=f"{trigger_type.value.replace('_', ' ').title()} breached. "
                    f"Threshold: {threshold}, Actual: {actual}. All positions closed.",
        ),
        event_id=event_id,
    )

    await broker.publish_kill_switch(cmd)
    await broker.set_account_state(cmd.account_number, "breached")
    await broker.publish_event(cmd.model_dump())

    return cmd
