"""
Pytest configuration and fixtures for testing the chess-analyser backend.

This file provides reusable fixtures for:
- Test database setup with in-memory SQLite
- Mock database sessions
- Sample user data
- Sample chess game data
- Test client for API testing
"""

import os
from typing import Generator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Integer, Column
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User
from main import app


# Override environment variables for testing
# Must be set BEFORE importing get_settings
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["DB_USER"] = "test_user" 
os.environ["DB_PASSWORD"] = "test_password"
os.environ["DB_HOST"] = "localhost"
os.environ["DB_NAME"] = "test_db"

# Clear the lru_cache for get_settings to ensure test environment is used
from app.core.config import get_settings
get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Database Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def test_db() -> Generator[Session, None, None]:
    """
    Create an in-memory SQLite database for testing.
    Each test gets a fresh database that's cleaned up after the test.
    
    NOTE: SQLite doesn't support all PostgreSQL features. For more accurate tests,
    use a test PostgreSQL database. SQLite treats BIGINT as INTEGER for autoincrement.
    """
    # Create an in-memory SQLite database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,  # Disable SQL logging in tests
    )
    
    # Create all tables - SQLite will auto-convert BIGINT to INTEGER
    Base.metadata.create_all(bind=engine)
    
    # Create a session factory
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create a session for the test
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after the test
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="function")
def client(test_db: Session) -> TestClient:
    """
    Create a FastAPI test client with a test database session.
    This allows testing API endpoints with a mocked database.
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    yield client
    
    # Clean up dependency overrides
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_user_data() -> dict:
    """
    Sample valid user data for testing registration and login.
    """
    return {
        "email": "testuser@example.com",
        "password": "TestPassword123!",
    }


@pytest.fixture
def sample_user_data_2() -> dict:
    """
    Another sample user for testing multiple users.
    """
    return {
        "email": "anotheruser@example.com",
        "password": "AnotherPass456@",
    }


@pytest.fixture
def db_user(test_db: Session, sample_user_data: dict) -> User:
    """
    Create a user in the test database.
    Useful for testing endpoints that require an existing user.
    """
    user = User(
        email=sample_user_data["email"].lower(),
        password_hash=get_password_hash(sample_user_data["password"]),
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def inactive_user(test_db: Session) -> User:
    """
    Create an inactive user in the test database.
    Useful for testing authentication of inactive accounts.
    """
    user = User(
        email="inactive@example.com",
        password_hash=get_password_hash("InactivePass123!"),
        is_active=False,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def auth_token(client: TestClient, db_user: User, sample_user_data: dict) -> str:
    """
    Generate a valid JWT token for an authenticated user.
    Useful for testing protected endpoints.
    """
    response = client.post(
        "/api/auth/login",
        json={
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# ---------------------------------------------------------------------------
# Chess.com API Mock Data Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_chess_game() -> dict:
    """
    Sample Chess.com game data structure.
    Based on the actual Chess.com API response format.
    """
    return {
        "url": "https://www.chess.com/game/live/123456789",
        "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]...",
        "time_control": "600",
        "end_time": 1640000000,  # Unix timestamp
        "rated": True,
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "time_class": "rapid",
        "eco": "B01",
        "white": {
            "username": "testplayer",
            "rating": 1500,
            "result": "win",
        },
        "black": {
            "username": "opponent",
            "rating": 1480,
            "result": "checkmated",
        },
        "accuracies": {
            "white": 85.5,
            "black": 78.3,
        },
    }


@pytest.fixture
def sample_chess_game_2() -> dict:
    """
    Another sample chess game with different data.
    """
    return {
        "url": "https://www.chess.com/game/live/987654321",
        "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]...",
        "time_control": "180",
        "end_time": 1640100000,
        "rated": True,
        "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "time_class": "blitz",
        "eco": "C50",
        "white": {
            "username": "opponent2",
            "rating": 1600,
            "result": "resigned",
        },
        "black": {
            "username": "testplayer",
            "rating": 1550,
            "result": "win",
        },
        "accuracies": {
            "white": 72.1,
            "black": 91.8,
        },
    }


@pytest.fixture
def sample_archives_response() -> dict:
    """
    Sample response from Chess.com archives endpoint.
    Returns list of monthly archive URLs.
    """
    return {
        "archives": [
            "https://api.chess.com/pub/player/testplayer/games/2023/12",
            "https://api.chess.com/pub/player/testplayer/games/2024/01",
            "https://api.chess.com/pub/player/testplayer/games/2024/02",
        ]
    }


@pytest.fixture
def sample_monthly_games_response(
    sample_chess_game: dict,
    sample_chess_game_2: dict,
) -> dict:
    """
    Sample response from Chess.com monthly games endpoint.
    """
    return {
        "games": [sample_chess_game, sample_chess_game_2]
    }


# ---------------------------------------------------------------------------
# Password Test Data
# ---------------------------------------------------------------------------

@pytest.fixture
def invalid_passwords() -> list[dict[str, str]]:
    """
    List of invalid passwords with their expected error messages.
    Useful for testing password validation.
    """
    return [
        {
            "password": "short1!",
            "error": "Password must be at least 8 characters long",
        },
        {
            "password": "nouppercase123!",
            "error": "Password must contain at least one uppercase letter",
        },
        {
            "password": "NoDigitsHere!",
            "error": "Password must contain at least one digit",
        },
        {
            "password": "NoSpecialChar123",
            "error": "Password must contain at least one special character",
        },
    ]
