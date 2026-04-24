"""
Router for game_history endpoints.

Endpoints:
  POST  /api/game-history/upsert    — called on review page load (status=in_progress)
  PATCH /api/game-history/complete  — called when result modal fires (status=done)
  GET   /api/game-history/          — called on profile page to list reviewed games
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.game_history import (
    complete_game_history,
    get_game_history_for_user,
    upsert_game_history,
)
from app.routers.auth import get_current_user
from app.schemas.game_history import (
    GameHistoryComplete,
    GameHistoryListOut,
    GameHistoryOut,
    GameHistoryUpsert,
)
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/game-history", tags=["Game History"])


@router.post("/upsert", response_model=GameHistoryOut)
async def upsert_history(
    payload: GameHistoryUpsert,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Insert or overwrite a game_history record on review page load.
    Always sets analysis_status to 'in_progress'.
    """
    record = upsert_game_history(db, user_id=current_user.user_id, payload=payload)
    return record


@router.patch("/complete", response_model=GameHistoryOut)
async def complete_history(
    payload: GameHistoryComplete,
    current_user: Annotated[UserOut, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Mark a game review as complete when the result modal fires.
    Sets analysis_status to 'done'.
    """
    record = complete_game_history(
        db, user_id=current_user.user_id, game_id=payload.game_id
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail="Game history record not found. Ensure upsert was called first.",
        )
    return record


@router.get("/", response_model=GameHistoryListOut)
async def list_history(
    current_user: Annotated[UserOut, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Return all reviewed games for the authenticated user.
    Used to populate the profile page reviewed-games list.
    """
    records = get_game_history_for_user(db, user_id=current_user.user_id)
    return GameHistoryListOut(games=records)