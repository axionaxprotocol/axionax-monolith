"""Redis pub/sub broker — thin wrapper around redis-py async."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import redis.asyncio as aioredis

from config import settings
from models.payloads import KillSwitchCommand


class RedisBroker:
    """Encapsulates all Redis interactions for the Propsentinel engine."""

    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def connect(self) -> None:
        self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        await self._redis.ping()

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    # -- Telemetry relay ---------------------------------------------------

    async def publish_telemetry(self, account_number: str, payload: dict) -> None:
        """Fan-out latest equity snapshot to Dashboard WebSocket subscribers."""
        channel = f"{settings.redis_channel_prefix}:telemetry:{account_number}"
        await self._redis.publish(channel, json.dumps(payload))

    # -- Kill switch -------------------------------------------------------

    async def publish_kill_switch(self, cmd: KillSwitchCommand) -> int:
        """Publish emergency close-all to every EA Bridge on this account.

        Returns the number of subscribers that received the message.
        """
        channel = f"{settings.redis_channel_prefix}:killswitch:{cmd.account_number}"
        payload = cmd.model_dump_json()
        return await self._redis.publish(channel, payload)

    # -- Event stream ------------------------------------------------------

    async def publish_event(self, event: dict) -> None:
        """Push a risk event onto the global event stream."""
        channel = f"{settings.redis_channel_prefix}:events"
        await self._redis.publish(channel, json.dumps(event))

    # -- State helpers -----------------------------------------------------

    async def set_account_state(self, account_number: str, state: str) -> None:
        """Track account state: 'active' | 'breached' | 'paused'."""
        key = f"{settings.redis_channel_prefix}:state:{account_number}"
        await self._redis.set(key, state)

    async def get_account_state(self, account_number: str) -> str | None:
        key = f"{settings.redis_channel_prefix}:state:{account_number}"
        return await self._redis.get(key)


broker = RedisBroker()
