"""Database stub — Member B will replace this with Supabase implementation.

Provides the interface contract so Member A's code can import and call
these functions without errors during development.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("backend.database")


async def init_db() -> None:
    """Initialize database connection (no-op stub, Supabase tables are pre-created)."""
    logger.info("database.init_db() called — stub, no-op")


async def save_scan(
    scan_id: str,
    result: Any,
    source: str,
    verdict: str,
) -> str:
    """Persist scan result + findings to the database.

    Member B implements this with Supabase inserts.
    """
    logger.warning("database.save_scan() — STUB: scan %s not persisted", scan_id)
    return scan_id


async def get_scan(scan_id: str) -> dict | None:
    """Fetch a full scan report by ID. Returns None if not found."""
    logger.warning("database.get_scan() — STUB: returning None")
    return None


async def get_recent_scans(limit: int = 20) -> list[dict]:
    """Fetch the most recent scans. Returns an empty list."""
    logger.warning("database.get_recent_scans() — STUB: returning []")
    return []
