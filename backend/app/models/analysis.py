"""
SQLAlchemy ORM model for move-level analysis results.
"""

from sqlalchemy import BigInteger, Column, DateTime, Integer, String, func

from app.core.database import Base


class MoveAnalysis(Base):
    """
    ORM model for persisted Stockfish analysis of individual moves.
    """

    __tablename__ = "move_analysis"

    user_id = Column(BigInteger, primary_key=True, nullable=False)
    game_id = Column(String, primary_key=True, nullable=False)
    move_number = Column(Integer, primary_key=True)
    fen_before = Column(String, nullable=True)
    played_move = Column(String, nullable=True)
    played_eval = Column(Integer, nullable=True)
    best_move = Column(String, nullable=True)
    best_eval = Column(Integer, nullable=True)
    centipawn_loss = Column(Integer, nullable=True)
    classification = Column(String, nullable=True)
    analysis_depth = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<MoveAnalysis(game_id={self.game_id}, move_number={self.move_number}, "
            f"played_move={self.played_move}, played_eval={self.played_eval}, "
            f"best_move={self.best_move}, best_eval={self.best_eval})>"
        )
