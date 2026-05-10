"""API key validation against PostgreSQL."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import asyncpg

from config import settings


@dataclass
class ValidatedKey:
    api_key_id: str
    user_id: str
    prop_firm_id: str
    account_number: str
    subscription_active: bool


async def validate_api_key(
    pool: asyncpg.Pool,
    raw_key: str,
    account_number: str,
) -> ValidatedKey | None:
    """Hash the raw key, look it up, and verify it's authorised for this account.

    Returns ``None`` if the key is invalid, revoked, or mismatched.
    """
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                ak.id          AS api_key_id,
                ak.user_id,
                a.prop_firm_id,
                a.account_number,
                s.status       AS sub_status
            FROM api_keys ak
            JOIN accounts a   ON a.user_id = ak.user_id
                              AND a.account_number = $2
            LEFT JOIN subscriptions s ON s.user_id = ak.user_id
                                      AND s.status = 'active'
            WHERE ak.key_hash   = $1
              AND ak.is_active  = true
              AND (ak.expires_at IS NULL OR ak.expires_at > now())
            """,
            key_hash,
            account_number,
        )

    if row is None:
        return None

    return ValidatedKey(
        api_key_id=str(row["api_key_id"]),
        user_id=str(row["user_id"]),
        prop_firm_id=str(row["prop_firm_id"]),
        account_number=row["account_number"],
        subscription_active=row["sub_status"] == "active",
    )
