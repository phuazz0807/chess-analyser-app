"""
CRUD operations related to chess game history.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.history import GameHistory
from app.schemas.history import GameHistoryRecord

def create_game_history_record(db: Session, user_id: int, game_id: str, parsed_pgn: GameHistoryRecord, status: str):
    """
    Create or update a game history record for this user/game pair.
    """
    existing = (
        db.query(GameHistory)
        .filter(
            GameHistory.user_id == user_id,
            GameHistory.game_id == game_id,
        )
        .one_or_none()
    )

    if existing is not None:
        existing.game_url = parsed_pgn.game_url
        existing.time_control = parsed_pgn.time_control
        existing.white_username = parsed_pgn.white_username
        existing.black_username = parsed_pgn.black_username
        existing.white_rating = parsed_pgn.white_rating
        existing.black_rating = parsed_pgn.black_rating
        existing.analysis_status = status
        existing.created_at = datetime.now(tz=timezone.utc)
        return existing

    record = GameHistory(
        game_id=game_id,
        user_id=user_id,
        game_url=parsed_pgn.game_url,
        time_control=parsed_pgn.time_control,
        white_username=parsed_pgn.white_username,
        black_username=parsed_pgn.black_username,
        white_rating=parsed_pgn.white_rating,
        black_rating=parsed_pgn.black_rating,
        white_accuracy=None,
        black_accuracy=None,
        white_ACPL=None,
        black_ACPL=None,
        analysis_status=status,
        created_at=datetime.now(tz=timezone.utc),
    )

    db.add(record)
    
    return record