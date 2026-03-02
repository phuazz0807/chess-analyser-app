from pydantic import BaseModel, Field
from typing import Literal, Optional


class AnalysisStartRequest(BaseModel):
    """Payload the frontend sends to kick off analysis."""
    game_id: str = Field(..., min_length=1)
    pgn: str = Field(..., min_length=1)
    analysis_depth: int = Field(default=18, ge=10, le=25)


class MoveResult(BaseModel):
    """Single‑move analysis result (matches Stockfish AnalysisResponse.results[])."""
    move_number: int
    fen_before: str
    played_move: str
    played_eval: int
    best_move: str
    best_eval: int
    centipawn_loss: int
    classification: str


class AnalysisCallbackPayload(BaseModel):
    """
    Payload POSTed by the Stockfish service when analysis is complete.
    Mirrors stockfish/app/schemas.py → AnalysisResponse.
    """
    game_id: str
    analysis_depth: int
    results: list[MoveResult]


class AnalysisStatusResponse(BaseModel):
    """Returned by the status endpoint so the frontend can poll."""
    game_id: str
    status: Literal["pending", "done", "error"]
    error: Optional[str] = None
