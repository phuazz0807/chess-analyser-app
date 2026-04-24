"""CRUD-style read operations for Chess.com game archive data."""

import httpx
from fastapi import HTTPException

CHESS_COM_BASE = "https://api.chess.com/pub/player"


async def fetch_archives(client: httpx.AsyncClient, username: str) -> list[str]:
    """Fetch monthly archive URLs for a Chess.com username."""
    url = f"{CHESS_COM_BASE}/{username}/games/archives"
    resp = await client.get(url)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Chess.com user '{username}' not found.")
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Chess.com API error when fetching archives (HTTP {resp.status_code}).",
        )

    data = resp.json()
    return data.get("archives", [])


async def fetch_monthly_games(client: httpx.AsyncClient, archive_url: str) -> list[dict]:
    """Fetch games from a single Chess.com month archive URL."""
    resp = await client.get(archive_url)

    if resp.status_code != 200:
        return []

    data = resp.json()
    return data.get("games", [])
