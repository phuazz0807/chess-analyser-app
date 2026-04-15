"""Router for fetching and filtering Chess.com games."""

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.crud.games import fetch_archives, fetch_monthly_games
from app.schemas.chesscom import GamesResponse
from app.utils.games import (
    HTTP_HEADERS,
    HTTP_TIMEOUT,
    filter_archive_urls,
    game_in_range,
    map_game,
    months_in_range,
    parse_date,
    validate_date_range,
)

router = APIRouter(tags=["Games"])


@router.get("/games", response_model=GamesResponse)
async def get_games(
    username: str = Query(..., min_length=1, description="Chess.com username"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    start = parse_date(start_date, "start_date")
    end = parse_date(end_date, "end_date")
    validate_date_range(start, end)

    needed_months = months_in_range(start, end)

    async with httpx.AsyncClient(headers=HTTP_HEADERS, timeout=HTTP_TIMEOUT, verify=False) as client:
        archives = await fetch_archives(client, username.strip().lower())
        urls_to_fetch = filter_archive_urls(archives, needed_months)

        if not urls_to_fetch:
            return GamesResponse(username=username, games=[])

        all_raw_games: list[dict] = []
        for url in urls_to_fetch:
            monthly = await fetch_monthly_games(client, url)
            all_raw_games.extend(monthly)

    filtered = [g for g in all_raw_games if game_in_range(g, start, end)]
    filtered.sort(key=lambda g: g.get("end_time", 0))

    if not filtered:
        raise HTTPException(
            status_code=404,
            detail=f"No games found for '{username}' between {start_date} and {end_date}.",
        )

    games = [map_game(g) for g in filtered]
    return GamesResponse(username=username, games=games)
