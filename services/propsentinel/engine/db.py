"""Database connection pool and query helpers."""

from __future__ import annotations

import asyncpg

from config import settings


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=4,
        max_size=20,
    )


async def upsert_terminal(
    pool: asyncpg.Pool,
    account_id: str,
    terminal_id: str,
    api_key_id: str,
    platform: str,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO terminals (account_id, terminal_id, api_key_id, platform, last_heartbeat, last_seen_at)
            VALUES ($1, $2, $3, $4, now(), now())
            ON CONFLICT (account_id, terminal_id) DO UPDATE
            SET last_heartbeat = now(),
                last_seen_at   = now(),
                is_active      = true,
                api_key_id     = EXCLUDED.api_key_id
            """,
            account_id,
            terminal_id,
            api_key_id,
            platform,
        )


async def insert_snapshot(
    pool: asyncpg.Pool,
    account_id: str,
    terminal_id: str,
    equity: str,
    balance: str,
    margin: str | None,
    free_margin: str | None,
    floating_pl: str,
    open_positions: int,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO equity_snapshots
                (account_id, terminal_id, equity, balance, margin, free_margin, floating_pl, open_positions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            account_id,
            terminal_id,
            equity,
            balance,
            margin,
            free_margin,
            floating_pl,
            open_positions,
        )


async def get_risk_profile(pool: asyncpg.Pool, account_id: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT daily_drawdown_pct, max_drawdown_pct,
                   daily_drawdown_abs, max_drawdown_abs,
                   extra_rules
            FROM risk_profiles
            WHERE account_id = $1 AND is_active = true
            ORDER BY version DESC
            LIMIT 1
            """,
            account_id,
        )
    return dict(row) if row else None


async def get_peaks(pool: asyncpg.Pool, account_id: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT peak_equity, daily_peak_equity, daily_reset_at FROM equity_peaks WHERE account_id = $1",
            account_id,
        )
    return dict(row) if row else None


async def upsert_peaks(
    pool: asyncpg.Pool,
    account_id: str,
    peak_equity: str,
    daily_peak_equity: str,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO equity_peaks (account_id, peak_equity, peak_balance, daily_peak_equity, daily_reset_at)
            VALUES ($1, $2, $2, $3, now())
            ON CONFLICT (account_id) DO UPDATE
            SET peak_equity       = GREATEST(equity_peaks.peak_equity, EXCLUDED.peak_equity),
                daily_peak_equity = CASE
                    WHEN equity_peaks.daily_reset_at < now() - INTERVAL '1 day'
                    THEN EXCLUDED.daily_peak_equity
                    ELSE GREATEST(equity_peaks.daily_peak_equity, EXCLUDED.daily_peak_equity)
                END,
                daily_reset_at = CASE
                    WHEN equity_peaks.daily_reset_at < now() - INTERVAL '1 day'
                    THEN now()
                    ELSE equity_peaks.daily_reset_at
                END,
                updated_at = now()
            """,
            account_id,
            peak_equity,
            daily_peak_equity,
        )


async def insert_risk_event(
    pool: asyncpg.Pool,
    account_id: str,
    trigger_type: str,
    rule_detail: str,
    threshold: str,
    actual_value: str,
    equity_at_event: str,
    peak_at_event: str,
    kill_signal_sent: bool,
) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO risk_events
                (account_id, trigger_type, rule_detail, threshold, actual_value,
                 equity_at_event, peak_at_event, kill_signal_sent)
            VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            account_id,
            trigger_type,
            rule_detail,
            threshold,
            actual_value,
            equity_at_event,
            peak_at_event,
            kill_signal_sent,
        )
    return str(row["id"])
