"""
Pydantic schemas for move analysis responses.
"""

from typing import Optional
from pydantic import BaseModel


class MoveAnalysisOut(BaseModel):
    """Schema for a single move's analysis data."""
    move_number: int
    fen_before: str
    played_move: Optional[str] = None
    played_eval: Optional[int] = None
    centipawn_loss: Optional[int] = None
    classification: Optional[str] = None
    best_move: Optional[str] = None
    best_eval: Optional[int] = None
    analysis_depth: Optional[int] = None

    class Config:
        from_attributes = True


class GameAnalysisResponse(BaseModel):
    """Schema for the full game analysis response."""
    game_id: str
    moves: list[MoveAnalysisOut]