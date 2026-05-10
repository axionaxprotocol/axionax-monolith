"""Propsentinel — FastAPI application entry point.

Start:  uvicorn main:app --reload --port 8100
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

import asyncpg
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from config import settings
from engine.auth import validate_api_key
from engine.db import create_pool, upsert_terminal, insert_snapshot
from engine.redis_broker import broker
from engine.risk_engine import evaluate
from models.payloads import (
    ErrorDetail,
    ErrorResponse,
    HeartbeatPayload,
    KillSwitchAck,
    TelemetryPayload,
)

# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

_pool: asyncpg.Pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await create_pool()
    await broker.connect()
    yield
    await broker.disconnect()
    await _pool.close()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Error helpers
# ---------------------------------------------------------------------------

def _error(status: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(
            error=ErrorDetail(code=code, message=message, details=details or {})
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# Dependency: extract & validate API key
# ---------------------------------------------------------------------------

async def _auth(request: Request, x_api_key: str = Header(..., alias="X-API-Key")):
    """Validate the API key and return the authenticated context."""
    # We need the body to get account_number, but FastAPI hasn't parsed it yet.
    # For telemetry, the account_number is in the JSON body — we validate
    # inside the endpoint after parsing. Here we just check key format.
    if not x_api_key.startswith(settings.api_key_prefix):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    return x_api_key


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/v1/telemetry")
async def ingest_telemetry(
    payload: TelemetryPayload,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Primary ingestion endpoint — called by EA Bridge ~1/sec."""

    # 1. Authenticate
    validated = await validate_api_key(_pool, x_api_key, payload.auth.account_number)
    if validated is None:
        return _error(401, "INVALID_API_KEY", "API key invalid, revoked, or mismatched account.")
    if not validated.subscription_active:
        return _error(403, "SUBSCRIPTION_EXPIRED", "Subscription is not active.")

    # 2. Track terminal
    await upsert_terminal(
        _pool,
        validated.api_key_id,
        payload.terminal.terminal_id,
        validated.api_key_id,
        payload.terminal.platform.value,
    )

    # 3. Persist snapshot
    await insert_snapshot(
        _pool,
        validated.api_key_id,
        payload.terminal.terminal_id,
        str(payload.portfolio.equity),
        str(payload.portfolio.balance),
        str(payload.portfolio.margin) if payload.portfolio.margin is not None else None,
        str(payload.portfolio.free_margin) if payload.portfolio.free_margin is not None else None,
        str(payload.portfolio.floating_pl),
        payload.portfolio.open_positions,
    )

    # 4. Relay to Dashboard subscribers
    await broker.publish_telemetry(payload.auth.account_number, payload.model_dump())

    # 5. Evaluate risk
    kill = await evaluate(_pool, payload, validated.api_key_id)
    if kill:
        kill.account_number = payload.auth.account_number
        # Re-publish with account_number filled (evaluate didn't have it)
        await broker.publish_kill_switch(kill)

    return {"status": "ok", "seq": payload.meta.seq}


@app.post("/api/v1/telemetry/heartbeat")
async def ingest_heartbeat(
    payload: HeartbeatPayload,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Low-power heartbeat when no positions are open."""
    validated = await validate_api_key(_pool, x_api_key, payload.account_number)
    if validated is None:
        return _error(401, "INVALID_API_KEY", "API key invalid or revoked.")

    await upsert_terminal(
        _pool,
        validated.api_key_id,
        payload.terminal_id,
        validated.api_key_id,
        payload.platform.value,
    )

    return {"status": "ok"}


@app.post("/api/v1/telemetry/ack")
async def ack_kill_switch(
    payload: KillSwitchAck,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """EA Bridge confirms kill switch execution."""
    validated = await validate_api_key(_pool, x_api_key, payload.account_number)
    if validated is None:
        return _error(401, "INVALID_API_KEY", "API key invalid or revoked.")

    async with _pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE risk_events
            SET kill_confirmed = true
            WHERE id = $1::uuid AND account_id = $2::uuid
            """,
            payload.event_id,
            validated.api_key_id,
        )

    return {"status": "acknowledged", "event_id": payload.event_id}


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
