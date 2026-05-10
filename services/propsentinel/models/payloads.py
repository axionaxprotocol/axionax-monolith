"""Pydantic models matching the Propsentinel payload spec v1.0.0."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Platform(str, Enum):
    mt4 = "mt4"
    mt5 = "mt5"


class TriggerType(str, Enum):
    daily_drawdown = "daily_drawdown"
    max_drawdown = "max_drawdown"
    custom_rule = "custom_rule"


class KillStatus(str, Enum):
    executed = "executed"
    partial = "partial"
    failed = "failed"


# ---------------------------------------------------------------------------
# Telemetry (EA Bridge → Engine)
# ---------------------------------------------------------------------------

class Position(BaseModel):
    ticket: int
    symbol: str
    type: str  # "buy" | "sell"
    volume: Decimal
    open_price: Decimal
    current_price: Decimal
    swap: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    profit: Decimal
    profit_pct: Decimal = Decimal("0")


class Portfolio(BaseModel):
    equity: Decimal
    balance: Decimal
    margin: Decimal | None = None
    free_margin: Decimal | None = None
    floating_pl: Decimal = Decimal("0")
    open_positions: int = 0
    margin_level_pct: Decimal | None = None


class TerminalMeta(BaseModel):
    terminal_id: str
    platform: Platform = Platform.mt5
    broker: str = ""
    local_time: datetime | None = None


class TelemetryMeta(BaseModel):
    version: str = "1.0.0"
    sent_at: datetime
    seq: int = 0


class TelemetryAuth(BaseModel):
    api_key: str
    account_number: str


class TelemetryPayload(BaseModel):
    """Full payload from EA Bridge POST /telemetry."""
    meta: TelemetryMeta
    auth: TelemetryAuth
    terminal: TerminalMeta
    portfolio: Portfolio
    positions: list[Position] = []

    @field_validator("auth")
    @classmethod
    def api_key_must_have_prefix(cls, v: TelemetryAuth) -> TelemetryAuth:
        if not v.api_key.startswith("psnt_"):
            raise ValueError("api_key must start with 'psnt_'")
        return v


# ---------------------------------------------------------------------------
# Kill Switch (Engine → Redis → EA Bridge)
# ---------------------------------------------------------------------------

class KillReason(BaseModel):
    type: TriggerType
    threshold: Decimal
    actual: Decimal
    peak_equity: Decimal
    current_equity: Decimal
    drawdown_pct: Decimal


class KillAction(BaseModel):
    close_all_positions: bool = True
    disable_auto_trading: bool = True
    message: str = ""


class KillSwitchCommand(BaseModel):
    """Published to Redis channel propsentinel:killswitch:{account_number}."""
    command: str = "kill_switch"
    version: str = "1.0.0"
    issued_at: datetime
    account_number: str
    reason: KillReason
    action: KillAction
    event_id: str


# ---------------------------------------------------------------------------
# Kill Switch ACK (EA Bridge → Engine)
# ---------------------------------------------------------------------------

class KillAckDetails(BaseModel):
    positions_closed: int = 0
    auto_trading_disabled: bool = False
    executed_at: datetime | None = None


class KillSwitchAck(BaseModel):
    """EA Bridge confirms kill switch execution."""
    event_id: str
    account_number: str
    terminal_id: str
    status: KillStatus
    details: KillAckDetails = KillAckDetails()


# ---------------------------------------------------------------------------
# Heartbeat (low-power idle mode)
# ---------------------------------------------------------------------------

class HeartbeatPayload(BaseModel):
    api_key: str
    account_number: str
    terminal_id: str
    platform: Platform = Platform.mt5
    equity: Decimal
    balance: Decimal
    floating_pl: Decimal = Decimal("0")
    open_positions: int = 0
    sent_at: datetime


# ---------------------------------------------------------------------------
# Error envelope
# ---------------------------------------------------------------------------

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail
