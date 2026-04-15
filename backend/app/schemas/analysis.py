"""
Pydantic schemas used by analysis API endpoints and callbacks.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class AnalysisStartRequest(BaseModel):
    """Payload the frontend sends to kick off analysis."""

    user_id: int = Field(...)
    game_id: str = Field(..., min_length=1)
    pgn: str = Field(..., min_length=1)
    analysis_depth: int = Field(default=18, ge=10, le=25)


class MoveResult(BaseModel):
    """Single-move analysis result from Stockfish."""

    move_number: int
    fen_before: str
    played_move: str
    played_eval: int
    best_move: str
    best_eval: int
    centipawn_loss: int
    classification: str


class AnalysisCallbackPayload(BaseModel):
    """Payload POSTed by Stockfish service when analysis completes."""

    game_id: str
    analysis_depth: int
    results: list[MoveResult]


class AnalysisStatusResponse(BaseModel):
    """Response model used by status polling endpoint."""

    game_id: str
    status: Literal["pending", "done", "error"]
    error: Optional[str] = None
