"""
CRUD operations for the game_history table.
"""

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.game_history import GameHistory
from app.schemas.game_history import GameHistoryUpsert


def upsert_game_history(
    db: Session,
    user_id: int,
    payload: GameHistoryUpsert,
) -> GameHistory:
    """
    Insert or overwrite a game_history record for (user_id, game_id).
    Always sets analysis_status to 'in_progress'.
    """
    stmt = (
        pg_insert(GameHistory)
        .values(
            user_id         = user_id,
            game_id         = payload.game_id,
            game_url        = payload.game_url,
            pgn             = payload.pgn,
            time_control    = payload.time_control,
            white_username  = payload.white_username,
            black_username  = payload.black_username,
            white_rating    = payload.white_rating,
            black_rating    = payload.black_rating,
            white_result    = payload.white_result,
            black_result    = payload.black_result,
            white_accuracy  = payload.white_accuracy,
            black_accuracy  = payload.black_accuracy,
            white_acpl      = payload.white_acpl,
            black_acpl      = payload.black_acpl,
            analysis_status = "in_progress",
        )
        .on_conflict_do_update(
            index_elements=["user_id", "game_id"],
            set_=dict(
                game_url        = payload.game_url,
                pgn             = payload.pgn,
                time_control    = payload.time_control,
                white_username  = payload.white_username,
                black_username  = payload.black_username,
                white_rating    = payload.white_rating,
                black_rating    = payload.black_rating,
                white_result    = payload.white_result,
                black_result    = payload.black_result,
                white_accuracy  = payload.white_accuracy,
                black_accuracy  = payload.black_accuracy,
                white_acpl      = payload.white_acpl,
                black_acpl      = payload.black_acpl,
                analysis_status = "in_progress",
            ),
        )
        .returning(GameHistory)
    )
    result = db.execute(stmt)
    db.commit()
    return result.scalar_one()


def complete_game_history(
    db: Session,
    user_id: int,
    game_id: str,
) -> GameHistory | None:
    """
    Set analysis_status = 'done' for the given (user_id, game_id).
    """
    record = (
        db.query(GameHistory)
        .filter(GameHistory.user_id == user_id, GameHistory.game_id == game_id)
        .first()
    )
    if not record:
        return None

    record.analysis_status = "done"
    db.commit()
    db.refresh(record)
    return record


def get_game_history_for_user(
    db: Session,
    user_id: int,
) -> list[GameHistory]:
    """
    Return all game_history records for a user, most recent first.
    """
    return (
        db.query(GameHistory)
        .filter(GameHistory.user_id == user_id)
        .order_by(GameHistory.created_at.desc())
        .all()
    )