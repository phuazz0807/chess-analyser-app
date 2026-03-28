"""
Tests for app/routers/analysis.py

This module tests:
- GET /api/analysis/{game_id} endpoint
- Authentication requirements
- 404 handling when no analysis exists
- Correct data returned for a valid game
- Composite primary key (move_number + game_id)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.move_analysis import MoveAnalysis
from app.models.user import User


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_GAME_ID = "https://www.chess.com/game/live/123456789"
OTHER_GAME_ID  = "https://www.chess.com/game/live/987654321"


@pytest.fixture
def sample_move_analysis(test_db: Session) -> list[MoveAnalysis]:
    """
    Insert sample move analysis rows into the test DB.
    Uses a fixed user_id of 1 and SAMPLE_GAME_ID.
    """
    moves = [
        MoveAnalysis(
            user_id=1,
            game_id=SAMPLE_GAME_ID,
            move_number=1,
            fen_before="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            played_move="e2e4",
            played_eval=114,
            centipawn_loss=0,
            classification="best",
            best_move="e2e4",
            best_eval=114,
            analysis_depth=18,
        ),
        MoveAnalysis(
            user_id=1,
            game_id=SAMPLE_GAME_ID,
            move_number=2,
            fen_before="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            played_move="c7c5",
            played_eval=330,
            centipawn_loss=59,
            classification="inaccuracy",
            best_move="e7e5",
            best_eval=-26,
            analysis_depth=18,
        ),
        MoveAnalysis(
            user_id=1,
            game_id=SAMPLE_GAME_ID,
            move_number=3,
            fen_before="rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
            played_move="g1f3",
            played_eval=-31,
            centipawn_loss=70,
            classification="inaccuracy",
            best_move="g1f3",
            best_eval=-31,
            analysis_depth=18,
        ),
    ]
    for m in moves:
        test_db.add(m)
    test_db.commit()
    return moves


@pytest.fixture
def other_game_analysis(test_db: Session) -> MoveAnalysis:
    """Insert a move for a different game to test filtering."""
    move = MoveAnalysis(
        user_id=1,
        game_id=OTHER_GAME_ID,
        move_number=1,
        fen_before="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        played_move="d2d4",
        played_eval=50,
        centipawn_loss=0,
        classification="best",
        best_move="d2d4",
        best_eval=50,
        analysis_depth=18,
    )
    test_db.add(move)
    test_db.commit()
    return move


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetGameAnalysisAuth:
    """Test authentication requirements for the analysis endpoint."""

    def test_requires_authentication(self, client: TestClient):
        """Endpoint should return 401 without a token."""
        response = client.get(f"/api/analysis/{SAMPLE_GAME_ID}")
        assert response.status_code == 401

    def test_rejects_invalid_token(self, client: TestClient):
        """Endpoint should return 401 with an invalid token."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_rejects_missing_bearer_prefix(self, client: TestClient, auth_token: str):
        """Endpoint should reject token without Bearer prefix."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": auth_token},
        )
        assert response.status_code == 401


class TestGetGameAnalysis404:
    """Test 404 handling when no analysis data exists."""

    def test_returns_404_when_no_analysis(self, client: TestClient, auth_token: str):
        """Should return 404 when no analysis exists for the given game_id."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404
        assert "no analysis found" in response.json()["detail"].lower()

    def test_returns_404_for_unknown_game(self, client: TestClient, auth_token: str, sample_move_analysis):
        """Should return 404 for a game_id that has no rows."""
        response = client.get(
            "/api/analysis/https://www.chess.com/game/live/nonexistent",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404


class TestGetGameAnalysisSuccess:
    """Test successful analysis retrieval."""

    def test_returns_200_with_valid_data(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Should return 200 with analysis data for a valid game_id."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200

    def test_returns_correct_game_id(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Response should include the correct game_id."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        data = response.json()
        assert data["game_id"] == SAMPLE_GAME_ID

    def test_returns_correct_number_of_moves(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Should return all moves for the game."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        data = response.json()
        assert len(data["moves"]) == 3

    def test_moves_ordered_by_move_number(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Moves should be returned in order of move_number."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        moves = response.json()["moves"]
        move_numbers = [m["move_number"] for m in moves]
        assert move_numbers == sorted(move_numbers)

    def test_move_fields_are_correct(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """First move should have correct field values."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        first_move = response.json()["moves"][0]
        assert first_move["move_number"] == 1
        assert first_move["played_move"] == "e2e4"
        assert first_move["best_move"] == "e2e4"
        assert first_move["classification"] == "best"
        assert first_move["centipawn_loss"] == 0
        assert first_move["played_eval"] == 114

    def test_returns_correct_best_move_uci(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Best move should be in UCI notation (4 chars)."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        for move in response.json()["moves"]:
            if move["best_move"]:
                assert len(move["best_move"]) >= 4

    def test_does_not_return_other_game_moves(
        self, client: TestClient, auth_token: str, sample_move_analysis, other_game_analysis
    ):
        """Should only return moves for the requested game_id."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        moves = response.json()["moves"]
        for move in moves:
            assert move["move_number"] in [1, 2, 3]

    def test_other_game_returns_its_own_moves(
        self, client: TestClient, auth_token: str, sample_move_analysis, other_game_analysis
    ):
        """Requesting another game should return only that game's moves."""
        response = client.get(
            f"/api/analysis/{OTHER_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == OTHER_GAME_ID
        assert len(data["moves"]) == 1
        assert data["moves"][0]["played_move"] == "d2d4"


class TestGetGameAnalysisSchema:
    """Test the response schema structure."""

    def test_response_has_game_id_and_moves(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Response should have game_id and moves fields."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        data = response.json()
        assert "game_id" in data
        assert "moves" in data

    def test_move_has_required_fields(
        self, client: TestClient, auth_token: str, sample_move_analysis
    ):
        """Each move should have all required fields."""
        response = client.get(
            f"/api/analysis/{SAMPLE_GAME_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        move = response.json()["moves"][0]
        required_fields = [
            "move_number", "fen_before", "played_move", "played_eval",
            "centipawn_loss", "classification", "best_move", "best_eval",
            "analysis_depth",
        ]
        for field in required_fields:
            assert field in move

    def test_optional_fields_can_be_null(
        self, client: TestClient, auth_token: str, test_db: Session
    ):
        """Optional fields should be nullable."""
        move = MoveAnalysis(
            user_id=1,
            game_id="https://www.chess.com/game/live/nulltest",
            move_number=1,
            fen_before="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            played_move=None,
            played_eval=None,
            centipawn_loss=None,
            classification=None,
            best_move=None,
            best_eval=None,
            analysis_depth=None,
        )
        test_db.add(move)
        test_db.commit()

        response = client.get(
            "/api/analysis/https://www.chess.com/game/live/nulltest",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        result_move = response.json()["moves"][0]
        assert result_move["played_move"] is None
        assert result_move["best_move"] is None
        assert result_move["centipawn_loss"] is None