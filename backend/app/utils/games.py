"""Utility helpers for Chess.com games endpoint."""

from datetime import date, datetime, timezone
from fastapi import HTTPException
from app.schemas.chesscom import Game, GameAccuracies

HTTP_HEADERS = {"User-Agent": "ChessAnalyserApp/1.0"}
HTTP_TIMEOUT = 30.0


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


def months_in_range(start: date, end: date) -> set[str]:
    """Return set of YYYY/MM strings from start month through end month."""
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
    """Keep only archive URLs whose trailing YYYY/MM is in needed."""
    selected: list[str] = []
    for url in archive_urls:
        parts = url.rstrip("/").split("/")
        if len(parts) >= 2:
            year_month = f"{parts[-2]}/{parts[-1]}"
            if year_month in needed:
                selected.append(url)
    return selected


def game_in_range(game: dict, start: date, end: date) -> bool:
    """Return True if game's end_time is within [start, end] in UTC dates."""
    end_time = game.get("end_time")
    if end_time is None:
        return False
    game_date = datetime.fromtimestamp(end_time, tz=timezone.utc).date()
    return start <= game_date <= end


def map_game(game: dict) -> Game:
    """Extract response fields from a raw Chess.com game dictionary."""
    white = game.get("white") or {}
    black = game.get("black") or {}
    accuracies_raw = game.get("accuracies")

    if accuracies_raw and isinstance(accuracies_raw, dict):
        accuracies = GameAccuracies(
            white=accuracies_raw.get("white"),
            black=accuracies_raw.get("black"),
        )
    else:
        accuracies = GameAccuracies(white=0, black=0)

    return Game(
        id=game.get("url").split("/")[-1] if game.get("url") else None,
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
