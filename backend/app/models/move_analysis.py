from sqlalchemy import BigInteger, Column, DateTime, Integer, String, func
from sqlalchemy.orm import declarative_base
from app.core.database import Base

class MoveAnalysis(Base):
    __tablename__ = "move_analysis"

    user_id = Column(BigInteger, nullable=True)
    move_number = Column(Integer, primary_key=True, nullable=False)
    game_id = Column(String, primary_key=True, nullable=False)
    fen_before = Column(String, nullable=False)
    played_move = Column(String, nullable=True)
    played_eval = Column(Integer, nullable=True)
    centipawn_loss = Column(Integer, nullable=True)
    classification = Column(String, nullable=True)
    best_move = Column(String, nullable=True)
    best_eval = Column(Integer, nullable=True)
    analysis_depth = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<MoveAnalysis(game_id={self.game_id}, move={self.move_number}, best={self.best_move})>"