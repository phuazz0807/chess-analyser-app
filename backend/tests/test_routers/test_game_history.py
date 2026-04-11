"""
Tests for app/routers/game_history.py

Tests the HTTP layer only — CRUD functions are mocked to avoid
PostgreSQL-specific pg_insert incompatibility with SQLite test DB.

Covers:
- Authentication requirements for all endpoints
- POST /api/game-history/upsert
- PATCH /api/game-history/complete
- GET /api/game-history/
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAMPLE_GAME_ID  = "https://www.chess.com/game/live/111111111"
SAMPLE_GAME_ID2 = "https://www.chess.com/game/live/222222222"

UPSERT_PAYLOAD = {
    "game_id":        SAMPLE_GAME_ID,
    "game_url":       SAMPLE_GAME_ID,
    "pgn":            "1. e4 e5 2. Nf3 Nc6",
    "time_control":   "600",
    "white_username": "hikaru",
    "black_username": "magnuscarlsen",
    "white_rating":   3000,
    "black_rating":   2850,
    "white_result":   "win",
    "black_result":   "checkmated",
    "white_accuracy": 95.0,
    "black_accuracy": 88.0,
    "white_acpl":     None,
    "black_acpl":     None,
}


# ---------------------------------------------------------------------------
# Mock factory helpers
# ---------------------------------------------------------------------------

def make_game_record(user_id=1, game_id=SAMPLE_GAME_ID, status="in_progress", **overrides):
    """Build a mock GameHistory-like object."""
    record = MagicMock()
    record.user_id          = user_id
    record.game_id          = game_id
    record.game_url         = game_id
    record.pgn              = overrides.get("pgn", "1. e4 e5 2. Nf3 Nc6")
    record.time_control     = overrides.get("time_control", "600")
    record.white_username   = overrides.get("white_username", "hikaru")
    record.black_username   = overrides.get("black_username", "magnuscarlsen")
    record.white_rating     = overrides.get("white_rating", 3000)
    record.black_rating     = overrides.get("black_rating", 2850)
    record.white_result     = overrides.get("white_result", "win")
    record.black_result     = overrides.get("black_result", "checkmated")
    record.white_accuracy   = overrides.get("white_accuracy", 95.0)
    record.black_accuracy   = overrides.get("black_accuracy", 88.0)
    record.white_acpl       = None
    record.black_acpl       = None
    record.analysis_status  = status
    record.created_at       = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return record


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class TestGameHistoryAuth:
    """Test authentication requirements for all game history endpoints."""

    def test_upsert_requires_auth(self, client: TestClient):
        response = client.post("/api/game-history/upsert", json=UPSERT_PAYLOAD)
        assert response.status_code == 401

    def test_complete_requires_auth(self, client: TestClient):
        response = client.patch("/api/game-history/complete", json={"game_id": SAMPLE_GAME_ID})
        assert response.status_code == 401

    def test_list_requires_auth(self, client: TestClient):
        response = client.get("/api/game-history/")
        assert response.status_code == 401

    def test_upsert_rejects_invalid_token(self, client: TestClient):
        response = client.post(
            "/api/game-history/upsert",
            json=UPSERT_PAYLOAD,
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_list_rejects_invalid_token(self, client: TestClient):
        response = client.get(
            "/api/game-history/",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/game-history/upsert
# ---------------------------------------------------------------------------

class TestUpsertEndpoint:
    """Test POST /api/game-history/upsert."""

    def test_upsert_returns_200(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.status_code == 200

    def test_upsert_returns_correct_game_id(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["game_id"] == SAMPLE_GAME_ID

    def test_upsert_sets_status_in_progress(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record(status="in_progress")):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["analysis_status"] == "in_progress"

    def test_upsert_stores_player_info(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        data = response.json()
        assert data["white_username"] == "hikaru"
        assert data["black_username"] == "magnuscarlsen"
        assert data["white_rating"] == 3000
        assert data["black_rating"] == 2850

    def test_upsert_stores_results_and_pgn(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        data = response.json()
        assert data["white_result"] == "win"
        assert data["black_result"] == "checkmated"
        assert data["pgn"] == "1. e4 e5 2. Nf3 Nc6"

    def test_upsert_calls_crud_with_correct_user_id(self, client: TestClient, auth_token: str, db_user):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()) as mock_upsert:
            client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args
        assert call_kwargs.kwargs["user_id"] == db_user.user_id

    def test_upsert_returns_updated_player_info(self, client: TestClient, auth_token: str):
        updated_record = make_game_record(white_username="newplayer", white_rating=1500)
        with patch("app.routers.game_history.upsert_game_history", return_value=updated_record):
            response = client.post(
                "/api/game-history/upsert",
                json={**UPSERT_PAYLOAD, "white_username": "newplayer", "white_rating": 1500},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        data = response.json()
        assert data["white_username"] == "newplayer"
        assert data["white_rating"] == 1500

    def test_upsert_response_has_required_fields(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.upsert_game_history", return_value=make_game_record()):
            response = client.post(
                "/api/game-history/upsert",
                json=UPSERT_PAYLOAD,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        data = response.json()
        required_fields = [
            "user_id", "game_id", "game_url", "analysis_status",
            "white_username", "black_username", "white_rating", "black_rating",
        ]
        for field in required_fields:
            assert field in data

    def test_upsert_with_minimal_payload(self, client: TestClient, auth_token: str):
        minimal_record = MagicMock()
        minimal_record.user_id         = 1
        minimal_record.game_id         = SAMPLE_GAME_ID2
        minimal_record.game_url        = SAMPLE_GAME_ID2
        minimal_record.pgn             = None
        minimal_record.time_control    = None
        minimal_record.white_username  = None
        minimal_record.black_username  = None
        minimal_record.white_rating    = None
        minimal_record.black_rating    = None
        minimal_record.white_result    = None
        minimal_record.black_result    = None
        minimal_record.white_accuracy  = None
        minimal_record.black_accuracy  = None
        minimal_record.white_acpl      = None
        minimal_record.black_acpl      = None
        minimal_record.analysis_status = "in_progress"
        minimal_record.created_at      = datetime(2026, 1, 1, tzinfo=timezone.utc)

        with patch("app.routers.game_history.upsert_game_history", return_value=minimal_record):
            response = client.post(
                "/api/game-history/upsert",
                json={"game_id": SAMPLE_GAME_ID2, "game_url": SAMPLE_GAME_ID2},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.status_code == 200
        assert response.json()["pgn"] is None


# ---------------------------------------------------------------------------
# PATCH /api/game-history/complete
# ---------------------------------------------------------------------------

class TestCompleteEndpoint:
    """Test PATCH /api/game-history/complete."""

    def test_complete_returns_200(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.complete_game_history", return_value=make_game_record(status="done")):
            response = client.patch(
                "/api/game-history/complete",
                json={"game_id": SAMPLE_GAME_ID},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.status_code == 200

    def test_complete_sets_status_done(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.complete_game_history", return_value=make_game_record(status="done")):
            response = client.patch(
                "/api/game-history/complete",
                json={"game_id": SAMPLE_GAME_ID},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["analysis_status"] == "done"

    def test_complete_returns_404_when_no_record(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.complete_game_history", return_value=None):
            response = client.patch(
                "/api/game-history/complete",
                json={"game_id": "https://www.chess.com/game/live/nonexistent"},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_complete_returns_correct_game_id(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.complete_game_history", return_value=make_game_record(status="done")):
            response = client.patch(
                "/api/game-history/complete",
                json={"game_id": SAMPLE_GAME_ID},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["game_id"] == SAMPLE_GAME_ID

    def test_complete_calls_crud_with_correct_args(self, client: TestClient, auth_token: str, db_user):
        with patch("app.routers.game_history.complete_game_history", return_value=make_game_record(status="done")) as mock_complete:
            client.patch(
                "/api/game-history/complete",
                json={"game_id": SAMPLE_GAME_ID},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        mock_complete.assert_called_once()
        call_kwargs = mock_complete.call_args
        assert call_kwargs.kwargs["user_id"] == db_user.user_id
        assert call_kwargs.kwargs["game_id"] == SAMPLE_GAME_ID


# ---------------------------------------------------------------------------
# GET /api/game-history/
# ---------------------------------------------------------------------------

class TestListEndpoint:
    """Test GET /api/game-history/."""

    def test_list_returns_200(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.status_code == 200

    def test_list_returns_empty_when_no_history(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["games"] == []

    def test_list_returns_inserted_games(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[make_game_record()]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        data = response.json()
        assert len(data["games"]) == 1
        assert data["games"][0]["game_id"] == SAMPLE_GAME_ID

    def test_list_returns_multiple_games(self, client: TestClient, auth_token: str):
        records = [
            make_game_record(game_id=SAMPLE_GAME_ID),
            make_game_record(game_id=SAMPLE_GAME_ID2),
        ]
        with patch("app.routers.game_history.get_game_history_for_user", return_value=records):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert len(response.json()["games"]) == 2

    def test_list_response_has_games_key(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert "games" in response.json()

    def test_list_game_has_required_fields(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[make_game_record()]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        game = response.json()["games"][0]
        required_fields = [
            "user_id", "game_id", "game_url", "analysis_status",
            "white_username", "black_username",
        ]
        for field in required_fields:
            assert field in game

    def test_list_shows_correct_analysis_status(self, client: TestClient, auth_token: str):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[make_game_record(status="done")]):
            response = client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        assert response.json()["games"][0]["analysis_status"] == "done"

    def test_list_calls_crud_with_correct_user_id(self, client: TestClient, auth_token: str, db_user):
        with patch("app.routers.game_history.get_game_history_for_user", return_value=[]) as mock_list:
            client.get(
                "/api/game-history/",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        mock_list.assert_called_once()
        assert mock_list.call_args.kwargs["user_id"] == db_user.user_id