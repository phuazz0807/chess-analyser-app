"""
SQLAlchemy ORM model for the game_history table.
"""

from sqlalchemy import BigInteger,Integer, Column, DateTime, Float, String, Text, func

from app.core.database import Base


class GameHistory(Base):
    __tablename__ = "game_history"

    user_id = Column(BigInteger().with_variant(Integer(), "sqlite"), primary_key=True, nullable=False)
    game_id = Column(String, primary_key=True, nullable=False)

    game_url       = Column(String, nullable=False)
    pgn            = Column(Text, nullable=True)
    time_control   = Column(String, nullable=True)

    white_username = Column(String, nullable=True)
    black_username = Column(String, nullable=True)
    white_rating   = Column(BigInteger, nullable=True)
    black_rating   = Column(BigInteger, nullable=True)
    white_result   = Column(String, nullable=True)
    black_result   = Column(String, nullable=True)

    white_accuracy = Column(Float, nullable=True)
    black_accuracy = Column(Float, nullable=True)
    white_acpl     = Column(Float, nullable=True)
    black_acpl     = Column(Float, nullable=True)

    analysis_status = Column(String, nullable=False, default="in_progress")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self):
        return (
            f"<GameHistory(user_id={self.user_id}, game_id={self.game_id!r}, "
            f"status={self.analysis_status!r})>"
        )