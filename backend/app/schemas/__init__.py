"""Schemas module."""

from app.schemas.analysis import (
    AnalysisCallbackPayload,
    AnalysisStartRequest,
    AnalysisStatusResponse,
    MoveResult,
)
from app.schemas.chesscom import Game, GameAccuracies, GamesResponse
from app.schemas.history import GameHistoryRecord
from app.schemas.user import (
    MessageResponse,
    Token,
    TokenData,
    UserCreate,
    UserLogin,
    UserOut,
    UserProfileOut,
)

__all__ = [
    "AnalysisCallbackPayload",
    "AnalysisStartRequest",
    "AnalysisStatusResponse",
    "Game",
    "GameAccuracies",
    "GameHistoryRecord",
    "GamesResponse",
    "MessageResponse",
    "MoveResult",
    "Token",
    "TokenData",
    "UserCreate",
    "UserLogin",
    "UserOut",
    "UserProfileOut",
]
