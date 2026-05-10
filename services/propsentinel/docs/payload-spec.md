# Propsentinel — JSON Payload Specification

## Overview

All communication flows through **Redis** as the central message broker.
The EA Bridge (MQL4/MQL5) speaks HTTP/WebSocket to the Engine, which in turn
uses Redis Pub/Sub for real-time fan-out.

```
┌──────────────┐     HTTP POST      ┌─────────────────┐     PUBLISH      ┌──────────┐
│  EA Bridge   │ ────────────────►  │  FastAPI Engine  │ ──────────────► │  Redis   │
│  (MT4/MT5)   │                    │  (Risk Eval)     │                 │  Pub/Sub │
└──────┬───────┘                    └────────┬─────────┘                 └────┬─────┘
       │                                     │                                │
       │          SUBSCRIBE                   │         SUBSCRIBE              │
       │  channel:killswitch:{account}        │   channel:telemetry:{account}  │
       └─────────────────────────────────────┴────────────────────────────────┘
```

---

## 1. Telemetry Payload (EA Bridge → Engine)

**Endpoint:** `POST /api/v1/telemetry`
**Rate:** ~1 request/second per active terminal
**Auth:** `X-API-Key` header + HMAC body signature (optional, phase 2)

### Request

```json
{
  "meta": {
    "version": "1.0.0",
    "sent_at": "2026-05-06T15:30:00.000Z",
    "seq": 8472
  },
  "auth": {
    "api_key": "psnt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "account_number": "88812345"
  },
  "terminal": {
    "terminal_id": "MT5-ICM-001",
    "platform": "mt5",
    "broker": "ICMarkets",
    "local_time": "2026-05-06T22:30:00.000+07:00"
  },
  "portfolio": {
    "equity": 105432.18,
    "balance": 100000.00,
    "margin": 12450.30,
    "free_margin": 92981.88,
    "floating_pl": 5432.18,
    "open_positions": 3,
    "margin_level_pct": 846.7
  },
  "positions": [
    {
      "ticket": 17392001,
      "symbol": "EURUSD",
      "type": "buy",
      "volume": 0.50,
      "open_price": 1.08540,
      "current_price": 1.08720,
      "swap": -2.35,
      "commission": -3.50,
      "profit": 90.00,
      "profit_pct": 0.09
    }
  ]
}
```

### Field Reference

| Path | Type | Required | Description |
|------|------|----------|-------------|
| `meta.version` | string | ✅ | Payload schema version |
| `meta.sent_at` | ISO8601 | ✅ | EA-side timestamp (UTC) |
| `meta.seq` | uint32 | ✅ | Monotonic counter per terminal |
| `auth.api_key` | string | ✅ | Full API key (validated against `api_keys.key_hash`) |
| `auth.account_number` | string | ✅ | MT4/MT5 login |
| `terminal.terminal_id` | string | ✅ | Unique per installation |
| `terminal.platform` | enum | ✅ | `"mt4"` or `"mt5"` |
| `terminal.broker` | string | | Broker name for display |
| `terminal.local_time` | ISO8601 | | Trader's local time |
| `portfolio.equity` | decimal | ✅ | Current equity |
| `portfolio.balance` | decimal | ✅ | Current balance |
| `portfolio.margin` | decimal | | Total margin used |
| `portfolio.free_margin` | decimal | | Balance − margin |
| `portfolio.floating_pl` | decimal | ✅ | Unrealized P/L |
| `portfolio.open_positions` | uint16 | ✅ | Count of open trades |
| `portfolio.margin_level_pct` | decimal | | Equity / Margin × 100 |
| `positions[]` | array | | Open positions snapshot |

---

## 2. Kill Switch Command (Engine → Redis → EA Bridge)

**Channel:** `propsentinel:killswitch:{account_number}`
**Published by:** FastAPI Engine when risk threshold breached
**Consumed by:** All EA Bridge instances subscribed to that account

### Payload

```json
{
  "command": "kill_switch",
  "version": "1.0.0",
  "issued_at": "2026-05-06T15:30:01.234Z",
  "account_number": "88812345",
  "reason": {
    "type": "max_drawdown",
    "threshold": 10000.00,
    "actual": 10234.56,
    "peak_equity": 110234.56,
    "current_equity": 100000.00,
    "drawdown_pct": 9.28
  },
  "action": {
    "close_all_positions": true,
    "disable_auto_trading": true,
    "message": "Max drawdown breached. All positions closed. AutoTrading disabled."
  },
  "event_id": "evt_a1b2c3d4e5f6"
}
```

### Field Reference

| Path | Type | Description |
|------|------|-------------|
| `command` | string | Always `"kill_switch"` |
| `version` | string | Payload schema version |
| `issued_at` | ISO8601 | When engine triggered the event |
| `account_number` | string | Target account |
| `reason.type` | enum | `"daily_drawdown"` \| `"max_drawdown"` \| `"custom_rule"` |
| `reason.threshold` | decimal | The limit that was breached |
| `reason.actual` | decimal | The value that breached it |
| `reason.peak_equity` | decimal | Peak equity used for calculation |
| `reason.current_equity` | decimal | Equity at breach moment |
| `reason.drawdown_pct` | decimal | Drawdown percentage |
| `action.close_all_positions` | bool | Must close all open trades |
| `action.disable_auto_trading` | bool | Must disable AutoTrading button |
| `action.message` | string | Human-readable reason |
| `event_id` | string | References `risk_events.id` |

---

## 3. Kill Switch Acknowledgment (EA Bridge → Engine)

**Endpoint:** `POST /api/v1/telemetry/ack`
**Sent by:** EA Bridge after executing kill switch

```json
{
  "event_id": "evt_a1b2c3d4e5f6",
  "account_number": "88812345",
  "terminal_id": "MT5-ICM-001",
  "status": "executed",
  "details": {
    "positions_closed": 3,
    "auto_trading_disabled": true,
    "executed_at": "2026-05-06T15:30:02.100Z"
  }
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `executed` | Kill switch completed successfully |
| `partial` | Some positions couldn't close (slippage, market closed) |
| `failed` | EA couldn't execute (connection lost, etc.) |

---

## 4. Heartbeat (EA Bridge → Engine)

**Endpoint:** `POST /api/v1/telemetry/heartbeat`
**Rate:** Every 30 seconds when no positions open (low-power mode)

```json
{
  "api_key": "psnt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "account_number": "88812345",
  "terminal_id": "MT5-ICM-001",
  "platform": "mt5",
  "equity": 100000.00,
  "balance": 100000.00,
  "floating_pl": 0.00,
  "open_positions": 0,
  "sent_at": "2026-05-06T15:30:00.000Z"
}
```

---

## 5. Redis Channel Map

| Channel Pattern | Publisher | Subscribers | Purpose |
|-----------------|-----------|-------------|---------|
| `propsentinel:telemetry:{account}` | Engine (bridge) | Dashboard WebSocket | Real-time equity push to UI |
| `propsentinel:killswitch:{account}` | Engine | EA Bridge(s) | Emergency close-all signal |
| `propsentinel:events` | Engine | Dashboard, Audit Logger | All risk events stream |

---

## 6. Authentication Flow

```
EA Bridge                    FastAPI Engine                PostgreSQL
   │                              │                            │
   │  POST /telemetry             │                            │
   │  X-API-Key: psnt_xxx         │                            │
   │  ─────────────────────────►  │                            │
   │                              │  SELECT key_hash           │
   │                              │  FROM api_keys             │
   │                              │  WHERE key_hash =          │
   │                              │    SHA256('psnt_xxx')      │
   │                              │  ────────────────────────► │
   │                              │  ◄──────────────────────── │
   │                              │                            │
   │                              │  Validate:                 │
   │                              │  - key is_active = true    │
   │                              │  - user subscription valid │
   │                              │  - account_number matches  │
   │                              │                            │
   │  200 OK (or 401/403)         │                            │
   │  ◄─────────────────────────  │                            │
```

---

## 7. Error Responses

All errors follow a uniform envelope:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or has been revoked.",
    "details": {}
  }
}
```

### Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 401 | `MISSING_API_KEY` | No `X-API-Key` header |
| 401 | `INVALID_API_KEY` | Key not found or revoked |
| 403 | `SUBSCRIPTION_EXPIRED` | Payment past due |
| 403 | `ACCOUNT_MISMATCH` | Key not authorized for this account |
| 429 | `RATE_LIMITED` | Too many requests |
| 400 | `INVALID_PAYLOAD` | Malformed JSON or missing required fields |
