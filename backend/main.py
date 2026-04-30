"""
Chess Analyser Backend - FastAPI service that fetches and filters Chess.com games.

Run locally:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timezone
import httpx
from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router
from app.routers.user import router as user_router

app = FastAPI(title="Chess Analyser", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "https://chess-analyser-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(analysis_router)
app.include_router(games_router)
from app.routers.move_analysis import router as move_analysis_router

app.include_router(move_analysis_router)

from app.routers.game_history import router as game_history_router
app.include_router(game_history_router)

CHESS_COM_BASE = "https://api.chess.com/pub/player"
HTTP_HEADERS = {"User-Agent": "ChessAnalyserApp/1.0"}
HTTP_TIMEOUT = 30.0


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class GameAccuracies(BaseModel):
    white: Optional[float] = None
    black: Optional[float] = None


class Game(BaseModel):
    url: Optional[str] = None
    pgn: Optional[str] = None
    time_control: Optional[str] = None
    end_time: Optional[int] = None
    rated: Optional[bool] = None
    accuracies: Optional[GameAccuracies] = None
    fen: Optional[str] = None
    time_class: Optional[str] = None
    white_username: Optional[str] = None
    white_rating: Optional[int] = None
    white_result: Optional[str] = None
    black_username: Optional[str] = None
    black_rating: Optional[int] = None
    black_result: Optional[str] = None
    eco: Optional[str] = None


class GamesResponse(BaseModel):
    username: str
    games: list[Game]


# ---------------------------------------------------------------------------
# Date validation
# ---------------------------------------------------------------------------

def parse_date(value: str, field_name: str) -> date:
    """Parse a YYYY-MM-DD string into a date, raising HTTPException on failure."""
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Expected YYYY-MM-DD, got: {value!r}",
        )


def validate_date_range(start: date, end: date) -> None:
    """Ensure start_date <= end_date."""
    if start > end:
        raise HTTPException(
            status_code=400,
            detail=f"start_date ({start}) must not be after end_date ({end}).",
        )


# ---------------------------------------------------------------------------
# Archive month selection
# ---------------------------------------------------------------------------

def months_in_range(start: date, end: date) -> set[str]:
    """Return the set of 'YYYY/MM' strings covering every month from start to end."""
    months: set[str] = set()
    current_year, current_month = start.year, start.month
    end_year, end_month = end.year, end.month

    while (current_year, current_month) <= (end_year, end_month):
        months.add(f"{current_year}/{current_month:02d}")
        if current_month == 12:
            current_year += 1
            current_month = 1
        else:
            current_month += 1

    return months


def filter_archive_urls(archive_urls: list[str], needed: set[str]) -> list[str]:
    """Keep only archive URLs whose trailing YYYY/MM is in *needed*."""
    selected: list[str] = []
    for url in archive_urls:
        # URLs look like https://api.chess.com/pub/player/{user}/games/2024/01
        parts = url.rstrip("/").split("/")
        if len(parts) >= 2:
            year_month = f"{parts[-2]}/{parts[-1]}"
            if year_month in needed:
                selected.append(url)
    return selected


# ---------------------------------------------------------------------------
# Game filtering & mapping
# ---------------------------------------------------------------------------

def game_in_range(game: dict, start: date, end: date) -> bool:
    """Return True if the game's end_time falls within [start, end] inclusive."""
    end_time = game.get("end_time")
    if end_time is None:
        return False
    game_date = datetime.fromtimestamp(end_time, tz=timezone.utc).date()
    return start <= game_date <= end


def map_game(game: dict) -> Game:
    """Extract the required fields from a raw Chess.com game dict."""
    white = game.get("white") or {}
    black = game.get("black") or {}
    accuracies_raw = game.get("accuracies")

    accuracies = None
    if accuracies_raw and isinstance(accuracies_raw, dict):
        accuracies = GameAccuracies(
            white=accuracies_raw.get("white"),
            black=accuracies_raw.get("black"),
        )
    else:
        accuracies = GameAccuracies(
            white=0,
            black=0,
        )

    return Game(
        url=game.get("url"),
        pgn=game.get("pgn"),
        time_control=game.get("time_control"),
        end_time=game.get("end_time"),
        rated=game.get("rated"),
        accuracies=accuracies,
        fen=game.get("fen"),
        time_class=game.get("time_class"),
        white_username=white.get("username"),
        white_rating=white.get("rating"),
        white_result=white.get("result"),
        black_username=black.get("username"),
        black_rating=black.get("rating"),
        black_result=black.get("result"),
        eco=game.get("eco"),
    )


# ---------------------------------------------------------------------------
# Chess.com API helpers
# ---------------------------------------------------------------------------

async def fetch_archives(client: httpx.AsyncClient, username: str) -> list[str]:
    """Fetch the archive list for *username*. Returns a list of monthly URLs."""
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
    """Fetch games for a single month archive URL."""
    resp = await client.get(archive_url)

    if resp.status_code != 200:
        # Non-critical: skip months that fail instead of aborting everything.
        return []

    data = resp.json()
    return data.get("games", [])


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------
# simulation
@app.get("/games", response_model=GamesResponse)
async def get_games(
    username: str = Query(..., min_length=1, description="Chess.com username"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    # 1. Validate dates
    start = parse_date(start_date, "start_date")
    end = parse_date(end_date, "end_date")
    validate_date_range(start, end)

    # 2. Determine which months we need
    needed_months = months_in_range(start, end)

    async with httpx.AsyncClient(headers=HTTP_HEADERS, timeout=HTTP_TIMEOUT, verify=False) as client:
        # 3. Fetch archive list
        archives = await fetch_archives(client, username.strip().lower())

        # 4. Select only the months that overlap with the date range
        urls_to_fetch = filter_archive_urls(archives, needed_months)

        if not urls_to_fetch:
            return GamesResponse(username=username, games=[])

        # 5. Fetch games from each relevant month concurrently
        all_raw_games: list[dict] = []
        for url in urls_to_fetch:
            monthly = await fetch_monthly_games(client, url)
            all_raw_games.extend(monthly)

    # 6. Filter games strictly by [start_date, end_date] and sort by end_time
    filtered = [g for g in all_raw_games if game_in_range(g, start, end)]
    filtered.sort(key=lambda g: g.get("end_time", 0))

    if not filtered:
        raise HTTPException(
            status_code=404,
            detail=f"No games found for '{username}' between {start_date} and {end_date}.",
        )

    # 7. Map to response schema
    games = [map_game(g) for g in filtered]

    return GamesResponse(username=username, games=games)
