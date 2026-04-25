"""
CRUD operations related to chess game analysis.
"""

from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import MoveAnalysis
from app.schemas import AnalysisCallbackPayload


def create_move_analysis_record(db: Session, payload: AnalysisCallbackPayload, user_id: int) -> list[MoveAnalysis]:
    """
    Replace move analysis rows for this user/game with the latest batch.
    """
    db.query(MoveAnalysis).filter(
        MoveAnalysis.user_id == user_id,
        MoveAnalysis.game_id == payload.game_id,
    ).delete(synchronize_session=False)

    records = []
    for move in payload.results:
        record = MoveAnalysis(
            user_id=user_id,
            game_id=payload.game_id,
            move_number=move.move_number,
            fen_before=move.fen_before,
            played_move=move.played_move,
            played_eval=move.played_eval,
            best_move=move.best_move,
            best_eval=move.best_eval,
            centipawn_loss=move.centipawn_loss,
            classification=move.classification,
            analysis_depth=payload.analysis_depth,
            created_at=datetime.now(timezone.utc)
        )
        records.append(record)
    
    db.add_all(records)

    return records
