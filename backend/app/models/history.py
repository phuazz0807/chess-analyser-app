"""
SQLAlchemy ORM model for chess game history records.
"""

from sqlalchemy import BigInteger, Column, DateTime, Float, Integer, String, func

from app.core.database import Base


class GameHistory(Base):
    """
    ORM model for storing user-queried chess game analysis history records.
    """

    __tablename__ = "game_history"

    game_id = Column(String, primary_key=True)
    user_id = Column(BigInteger, primary_key=True)
    game_url = Column(String, nullable=True)
    time_control = Column(String, nullable=True)
    white_username = Column(String, nullable=True)
    black_username = Column(String, nullable=True)
    white_rating = Column(Integer, nullable=True)
    black_rating = Column(Integer, nullable=True)
    white_accuracy = Column(Float, nullable=True)
    black_accuracy = Column(Float, nullable=True)
    white_ACPL = Column("white_acpl", Float, nullable=True)
    black_ACPL = Column("black_acpl", Float, nullable=True)
    analysis_status = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<GameHistory(game_id={self.game_id}, user_id={self.user_id}, "
            f"status={self.analysis_status})>"
        )
