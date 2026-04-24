"""
Pydantic schemas for game history payloads.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class GameHistoryRecord(BaseModel):
    """
    Represents a record in the game_history table in Supabase.

    Fields:
        game_id:       Unique identifier for the game (string, not necessarily a UUID).
        user_id:       ID of the user who submitted the game (integer).
        game_url:      Optional URL to the game on Lichess or Chess.com.
        time_control:  Optional time control string (e.g. "5+0", "3+2").
        white_username: Optional username of the White player.
        black_username: Optional username of the Black player.
        white_rating:   Optional rating of the White player at game time.
        black_rating:   Optional rating of the Black player at game time.
        white_accuracy: Optional accuracy percentage for White (0-100).
        black_accuracy: Optional accuracy percentage for Black (0-100).
        white_ACPL:     Optional average centipawn loss for White.
        black_ACPL:     Optional average centipawn loss for Black.
        analysis_status: Status of the analysis ("pending", "done", or "error").
        created_at:     Optional timestamp when the record was created.
    """
    model_config = ConfigDict(from_attributes=True)

    game_id: str = Field(..., min_length=1)
    user_id: int
    game_url: Optional[str] = None
    time_control: Optional[str] = None
    white_username: Optional[str] = None
    black_username: Optional[str] = None
    white_rating: Optional[int] = Field(default=None, ge=0)
    black_rating: Optional[int] = Field(default=None, ge=0)
    white_accuracy: Optional[float] = Field(default=None, ge=0, le=100)
    black_accuracy: Optional[float] = Field(default=None, ge=0, le=100)
    white_ACPL: Optional[float] = None
    black_ACPL: Optional[float] = None
    analysis_status: Literal["pending", "done", "error"]
    created_at: Optional[datetime] = None
