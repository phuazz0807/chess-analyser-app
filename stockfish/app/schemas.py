"""
Pydantic models for the Stockfish analysis microservice.

Defines request/response schemas with validation constraints.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    """
    Payload sent by the backend to request analysis of a single game.

    Fields:
        game_id:        UUID of the game (passed through, not validated as UUID
                        so the caller can use any string identifier).
        pgn:            Full PGN string of the game.
        analysis_depth: Stockfish search depth (10–25 inclusive).
    """

    game_id: str = Field(..., min_length=1, description="Unique game identifier")
    pgn: str = Field(..., min_length=1, description="Full PGN string")
    analysis_depth: int = Field(
        default=18,
        ge=10,
        le=25,
        description="Stockfish search depth (10–25)",
    )

    @field_validator("pgn")
    @classmethod
    def pgn_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("PGN string must not be blank")
        return v


# ---------------------------------------------------------------------------
# Single‑move result
# ---------------------------------------------------------------------------

class MoveResult(BaseModel):
    """
    Analysis output for one half‑move (ply).

    Evaluations are in centipawns, always from White's perspective:
        positive → White is better
        negative → Black is better

    classification uses CPL thresholds:
        0–10   → best
        11–50  → good
        51–100 → inaccuracy
        101–300 → mistake
        300+   → blunder
    """

    move_number: int = Field(..., ge=1, description="Ply number (1‑indexed)")
    fen_before: str = Field(..., description="FEN of the position before the move")
    played_move: str = Field(..., description="Move actually played (UCI notation)")
    played_eval: int = Field(..., description="Centipawn eval after played move (White POV)")
    best_move: str = Field(..., description="Engine best move (UCI notation)")
    best_eval: int = Field(..., description="Centipawn eval after best move (White POV)")
    centipawn_loss: int = Field(..., ge=0, description="CPL = abs(best_eval - played_eval)")
    classification: Literal["best", "good", "inaccuracy", "mistake", "blunder"] = Field(
        ..., description="Human‑readable quality label"
    )


# ---------------------------------------------------------------------------
# Full response
# ---------------------------------------------------------------------------

class AnalysisResponse(BaseModel):
    """
    Complete analysis result returned by the service.
    """

    game_id: str
    analysis_depth: int
    results: List[MoveResult]
