"""
Pydantic schemas for game_history API requests and responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GameHistoryUpsert(BaseModel):
    game_id:        str
    game_url:       str
    pgn:            Optional[str]   = None
    time_control:   Optional[str]   = None
    white_username: Optional[str]   = None
    black_username: Optional[str]   = None
    white_rating:   Optional[int]   = None
    black_rating:   Optional[int]   = None
    white_result:   Optional[str]   = None
    black_result:   Optional[str]   = None
    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None
    white_acpl:     Optional[float] = None
    black_acpl:     Optional[float] = None


class GameHistoryComplete(BaseModel):
    game_id: str


class GameHistoryOut(BaseModel):
    user_id:        int
    game_id:        str
    game_url:       str
    pgn:            Optional[str]   = None
    time_control:   Optional[str]   = None
    white_username: Optional[str]   = None
    black_username: Optional[str]   = None
    white_rating:   Optional[int]   = None
    black_rating:   Optional[int]   = None
    white_result:   Optional[str]   = None
    black_result:   Optional[str]   = None
    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None
    white_acpl:     Optional[float] = None
    black_acpl:     Optional[float] = None
    analysis_status: str
    created_at:     Optional[datetime] = None

    class Config:
        from_attributes = True


class GameHistoryListOut(BaseModel):
    games: list[GameHistoryOut]