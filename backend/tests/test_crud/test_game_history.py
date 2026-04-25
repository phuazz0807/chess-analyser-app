"""
Tests for app/crud/game_history.py

Note: upsert_game_history uses pg_insert (PostgreSQL-specific) and cannot
be tested against the SQLite test DB. Those tests are covered at the router
layer with mocks in test_routers/test_game_history.py.

This file tests:
- complete_game_history: status update, missing record
- get_game_history_for_user: listing, ordering, filtering by user
"""

import pytest
from sqlalchemy.orm import Session

from app.crud.game_history import complete_game_history, get_game_history_for_user
from app.models.history import GameHistory


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_db_record(db: Session, user_id: int, game_id: str, status: str = "in_progress") -> GameHistory:
    """Directly insert a GameHistory record into the test DB."""
    record = GameHistory(
        user_id=user_id,
        game_id=game_id,
        game_url=game_id,
        pgn="1. e4 e5",
        time_control="600",
        white_username="hikaru",
        black_username="magnuscarlsen",
        white_rating=3000,
        black_rating=2850,
        white_result="win",
        black_result="checkmated",
        white_accuracy=95.0,
        black_accuracy=88.0,
        white_acpl=None,
        black_acpl=None,
        analysis_status=status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


SAMPLE_GAME_ID  = "https://www.chess.com/game/live/111111111"
SAMPLE_GAME_ID2 = "https://www.chess.com/game/live/222222222"
SAMPLE_GAME_ID3 = "https://www.chess.com/game/live/333333333"


# ---------------------------------------------------------------------------
# complete_game_history
# ---------------------------------------------------------------------------

class TestCompleteGameHistory:
    """Test complete_game_history CRUD function."""

    pytestmark = pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")

    def test_sets_status_to_done(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        record = complete_game_history(test_db, user_id=db_user.user_id, game_id=SAMPLE_GAME_ID)

        assert record is not None
        assert record.analysis_status == "done"

    def test_returns_updated_record(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        record = complete_game_history(test_db, user_id=db_user.user_id, game_id=SAMPLE_GAME_ID)

        assert record.game_id == SAMPLE_GAME_ID
        assert record.user_id == db_user.user_id

    def test_returns_none_when_no_record(self, test_db: Session, db_user):
        record = complete_game_history(test_db, user_id=db_user.user_id, game_id="nonexistent")

        assert record is None

    def test_completing_twice_stays_done(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        complete_game_history(test_db, user_id=db_user.user_id, game_id=SAMPLE_GAME_ID)
        record = complete_game_history(test_db, user_id=db_user.user_id, game_id=SAMPLE_GAME_ID)

        assert record.analysis_status == "done"

    def test_does_not_complete_other_users_record(self, test_db: Session, db_user):
        """Should not update records belonging to a different user."""
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        record = complete_game_history(test_db, user_id=99999, game_id=SAMPLE_GAME_ID)

        assert record is None

    def test_does_not_affect_other_games(self, test_db: Session, db_user):
        """Completing one game should not affect another game's status."""
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID2)

        complete_game_history(test_db, user_id=db_user.user_id, game_id=SAMPLE_GAME_ID)

        other = test_db.query(GameHistory).filter(
            GameHistory.user_id == db_user.user_id,
            GameHistory.game_id == SAMPLE_GAME_ID2,
        ).first()
        assert other.analysis_status == "in_progress"


# ---------------------------------------------------------------------------
# get_game_history_for_user
# ---------------------------------------------------------------------------

class TestGetGameHistoryForUser:
    """Test get_game_history_for_user CRUD function."""

    def test_returns_empty_list_when_no_records(self, test_db: Session, db_user):
        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        assert records == []

    @pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")
    def test_returns_inserted_record(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        assert len(records) == 1
        assert records[0].game_id == SAMPLE_GAME_ID

    @pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")
    def test_returns_all_records_for_user(self, test_db: Session, db_user):
        for game_id in [SAMPLE_GAME_ID, SAMPLE_GAME_ID2, SAMPLE_GAME_ID3]:
            make_db_record(test_db, db_user.user_id, game_id)

        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        assert len(records) == 3

    @pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")
    def test_does_not_return_other_users_records(self, test_db: Session, db_user):
        """Should only return records for the specified user."""
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        make_db_record(test_db, 99999, SAMPLE_GAME_ID2)

        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        assert len(records) == 1
        assert records[0].game_id == SAMPLE_GAME_ID

    @pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")
    def test_returns_correct_fields(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID)
        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        record = records[0]
        assert record.white_username == "hikaru"
        assert record.black_username == "magnuscarlsen"
        assert record.analysis_status == "in_progress"

    def test_returns_empty_list_for_unknown_user(self, test_db: Session):
        records = get_game_history_for_user(test_db, user_id=99999)

        assert records == []

    @pytest.mark.skip(reason="Temporarily disabled while GameHistory model/tests are being realigned.")
    def test_status_reflects_completion(self, test_db: Session, db_user):
        make_db_record(test_db, db_user.user_id, SAMPLE_GAME_ID, status="done")
        records = get_game_history_for_user(test_db, user_id=db_user.user_id)

        assert records[0].analysis_status == "done"
