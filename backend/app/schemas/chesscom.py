"""Pydantic schemas for Chess.com games endpoint responses."""

from typing import Optional
from pydantic import BaseModel


class GameAccuracies(BaseModel):
    """Per-side accuracy values returned by Chess.com."""

    white: Optional[float] = None
    black: Optional[float] = None


class Game(BaseModel):
    """Mapped game payload returned by the backend /games endpoint."""

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
    """Response model for games query endpoint."""

    username: str
    games: list[Game]
