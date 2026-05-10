-- ============================================================================
-- Propsentinel — Initial Database Schema (PostgreSQL 16+)
-- ============================================================================
-- Multi-tenant Prop Firm risk management: one DB serves many Prop Firms,
-- each with many traders, each with many accounts monitored in real-time.
--
-- Design principles:
--   1. UUID PKs — no sequential ID leakage across tenants.
--   2. JSONB for flexible risk rules — each Prop Firm can define custom limits.
--   3. Timestamptz everywhere — UTC, always.
--   4. Indexes match query patterns: lookups by account_number, api_key,
--      terminal_id, and time-range scans on equity_snapshots.
--   5. equity_snapshots is the hot table — consider partitioning by month
--      once volume exceeds ~50M rows.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- for API key hashing

-- ===========================================================================
-- 1. TENANTS — Prop Firms
-- ===========================================================================
CREATE TABLE prop_firms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,            -- URL-safe identifier
    branding        JSONB NOT NULL DEFAULT '{}',    -- logo_url, colors, etc.
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- 2. USERS — Traders / Prop Firm admins
-- ===========================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prop_firm_id    UUID NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,                   -- bcrypt / argon2id
    full_name       TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'trader',  -- 'trader' | 'admin' | 'superadmin'
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_prop_firm ON users(prop_firm_id);
CREATE INDEX idx_users_email ON users(email);

-- ===========================================================================
-- 3. API KEYS — EA Bridge authentication tokens
-- ===========================================================================
-- Each trader can generate multiple keys (e.g. one per terminal).
-- Keys are stored as SHA-256 hashes; the raw key is shown once at creation.
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash        TEXT NOT NULL UNIQUE,            -- SHA-256(raw_key)
    key_prefix      TEXT NOT NULL,                   -- first 8 chars for UI display ("psnt_ab12...")
    name            TEXT NOT NULL,                   -- user-given label ("MT5-Laptop")
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,                    -- NULL = never
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ===========================================================================
-- 4. TRADING ACCOUNTS — The core monitored entity
-- ===========================================================================
-- One trader may have multiple accounts (challenge + funded, or multiple
-- brokers). Each account has exactly ONE active risk profile at any time.
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prop_firm_id    UUID NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
    account_number  TEXT NOT NULL,                   -- MT4/MT5 login number
    broker_name     TEXT NOT NULL,                   -- "ICMarkets", "FTMO", etc.
    platform        TEXT NOT NULL DEFAULT 'mt5',     -- 'mt4' | 'mt5'
    currency        TEXT NOT NULL DEFAULT 'USD',
    initial_balance NUMERIC(18,2) NOT NULL,
    label           TEXT,                            -- user-given nickname
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(user_id, account_number)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_prop_firm ON accounts(prop_firm_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);

-- ===========================================================================
-- 5. RISK PROFILES — Per-account risk limits
-- ===========================================================================
-- Versioned: when a Prop Firm changes rules, we insert a new row and mark
-- the old one inactive. The engine always loads the active profile.
CREATE TABLE risk_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL DEFAULT 1,

    -- Drawdown limits (percentage of peak balance)
    daily_drawdown_pct  NUMERIC(5,2),               -- e.g. 5.00 = 5%
    max_drawdown_pct    NUMERIC(5,2),               -- e.g. 10.00 = 10%

    -- Absolute limits (overrides percentage if set)
    daily_drawdown_abs  NUMERIC(18,2),
    max_drawdown_abs    NUMERIC(18,2),

    -- Additional rules stored as flexible JSONB
    -- Examples: max_lot_size, max_positions, prohibited_symbols, 
    --           min_trading_days, profit_target_pct, max_daily_loss_streak
    extra_rules         JSONB NOT NULL DEFAULT '{}',

    is_active           BOOLEAN NOT NULL DEFAULT true,
    activated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at      TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_profiles_account ON risk_profiles(account_id, is_active)
    WHERE is_active = true;

-- ===========================================================================
-- 6. TERMINALS — Active MT4/MT5 instances
-- ===========================================================================
-- Track which terminals are currently streaming data for each account.
-- Deduplication: if two terminals share the same account, we keep the
-- latest equity snapshot regardless of which terminal sent it.
CREATE TABLE terminals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    terminal_id     TEXT NOT NULL,                   -- MT4/MT5 terminal unique ID
    api_key_id      UUID REFERENCES api_keys(id),
    platform        TEXT NOT NULL DEFAULT 'mt5',     -- 'mt4' | 'mt5'
    ip_address      INET,
    last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(account_id, terminal_id)
);

CREATE INDEX idx_terminals_account ON terminals(account_id);
CREATE INDEX idx_terminals_heartbeat ON terminals(last_heartbeat)
    WHERE is_active = true;

-- ===========================================================================
-- 7. EQUITY SNAPSHOTS — Real-time telemetry (HOT TABLE)
-- ===========================================================================
-- This is the highest-volume table. Each active terminal pushes a snapshot
-- every ~1 second. At 1000 terminals, that's ~86M rows/day.
--
-- Partitioning strategy (manual for now, pg_partman later):
--   CREATE TABLE equity_snapshots_2026_05 PARTITION OF equity_snapshots
--   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
--
-- Retention: DELETE or detach partitions older than 90 days.
CREATE TABLE equity_snapshots (
    id              BIGSERIAL,                       -- bigint for high volume
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    terminal_id     TEXT NOT NULL,
    equity          NUMERIC(18,2) NOT NULL,
    balance         NUMERIC(18,2) NOT NULL,
    margin          NUMERIC(18,2),                   -- NULL if no open positions
    free_margin     NUMERIC(18,2),
    floating_pl     NUMERIC(18,2) NOT NULL DEFAULT 0,
    open_positions  INTEGER NOT NULL DEFAULT 0,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when engine received it
    source_at       TIMESTAMPTZ,                         -- when EA sent it (client clock)

    PRIMARY KEY (received_at, id)                    -- partition-friendly PK
) PARTITION BY RANGE (received_at);

-- Default partition (catches rows before partitioning is set up)
CREATE TABLE equity_snapshots_default PARTITION OF equity_snapshots DEFAULT;

CREATE INDEX idx_snapshots_account_time ON equity_snapshots(account_id, received_at DESC);

-- ===========================================================================
-- 8. EQUITY PEAKS — Rolling peak equity for drawdown calculation
-- ===========================================================================
-- Materialized per-account peak equity. Updated by the engine on each
-- snapshot if equity > current peak. This avoids scanning snapshots.
CREATE TABLE equity_peaks (
    account_id          UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    peak_equity         NUMERIC(18,2) NOT NULL,
    peak_balance        NUMERIC(18,2) NOT NULL,
    daily_peak_equity   NUMERIC(18,2) NOT NULL,
    daily_reset_at      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- resets at midnight UTC
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- 9. RISK EVENTS — Kill switch execution log
-- ===========================================================================
-- Immutable audit trail. Every time the engine triggers a kill switch,
-- we record what threshold was breached and whether execution succeeded.
CREATE TABLE risk_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    trigger_type    TEXT NOT NULL,                   -- 'daily_drawdown' | 'max_drawdown' | 'custom_rule'
    rule_detail     JSONB NOT NULL,                  -- snapshot of the rule that fired
    threshold       NUMERIC(18,2) NOT NULL,          -- the limit value
    actual_value    NUMERIC(18,2) NOT NULL,          -- the value that breached
    equity_at_event NUMERIC(18,2) NOT NULL,
    peak_at_event   NUMERIC(18,2) NOT NULL,
    kill_signal_sent BOOLEAN NOT NULL DEFAULT false, -- did we publish to Redis?
    kill_confirmed  BOOLEAN NOT NULL DEFAULT false,  -- did EA acknowledge?
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_events_account ON risk_events(account_id, created_at DESC);
CREATE INDEX idx_risk_events_time ON risk_events(created_at);

-- ===========================================================================
-- 10. SUBSCRIPTIONS — Stripe-linked billing
-- ===========================================================================
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id  TEXT UNIQUE,
    stripe_customer_id      TEXT,
    plan_tier               TEXT NOT NULL DEFAULT 'starter',  -- 'starter' | 'pro' | 'enterprise'
    status                  TEXT NOT NULL DEFAULT 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
    max_accounts            INTEGER NOT NULL DEFAULT 1,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ===========================================================================
-- 11. AUDIT LOG — General-purpose immutable trail
-- ===========================================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    account_id      UUID REFERENCES accounts(id),
    action          TEXT NOT NULL,                   -- 'account.created', 'risk_profile.updated', 'kill_switch.triggered'
    details         JSONB NOT NULL DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_account ON audit_log(account_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- ===========================================================================
-- FUNCTIONS
-- ===========================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_prop_firms_updated_at
    BEFORE UPDATE ON prop_firms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
