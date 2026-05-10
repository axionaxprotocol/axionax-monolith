"""Centralised settings loaded from environment / .env."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "Propsentinel"
    debug: bool = False

    # --- Database ---
    database_url: str = "postgresql+asyncpg://propsentinel:changeme@localhost:5432/propsentinel"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    redis_channel_prefix: str = "propsentinel"

    # --- Risk Engine ---
    risk_eval_interval_ms: int = 500  # how often the engine wakes to evaluate
    terminal_heartbeat_timeout_s: int = 120  # mark terminal offline after this

    # --- Auth ---
    api_key_prefix: str = "psnt_"

    model_config = {"env_prefix": "PSNT_", "env_file": ".env"}


settings = Settings()
