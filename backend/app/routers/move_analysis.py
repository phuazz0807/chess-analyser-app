"""
Analysis router — endpoints for fetching move analysis data.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analysis import MoveAnalysis
from app.routers.auth import get_current_user
from app.schemas.move_analysis import GameAnalysisResponse, MoveAnalysisOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


# @router.get("/{game_id:path}", response_model=GameAnalysisResponse)
# async def get_game_analysis(
#     game_id: str,
#     current_user: Annotated[UserOut, Depends(get_current_user)],
#     db: Session = Depends(get_db),
# ):
#     return GameAnalysisResponse(game_id=game_id, moves=[])

@router.get("/{game_id:path}", response_model=GameAnalysisResponse)
async def get_game_analysis(
    game_id: str,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Fetch move-by-move analysis for a specific game.

    Returns all moves with their classifications, centipawn loss,
    played move, and best move in UCI notation.

    Requires valid JWT token in Authorization header.
    """
    moves = (
    db.query(MoveAnalysis)
    .filter(MoveAnalysis.game_id == game_id)
    .order_by(MoveAnalysis.move_number)
    .all()
)

    if not moves:
        raise HTTPException(
            status_code=404,
            detail=f"No analysis found for game '{game_id}'.",
        )

    return GameAnalysisResponse(
        game_id=game_id,
        moves=[MoveAnalysisOut.model_validate(m) for m in moves],
    )