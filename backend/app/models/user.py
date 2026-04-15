"""
SQLAlchemy ORM model for the users table.
"""

from sqlalchemy import BigInteger,Integer, Boolean, Column, DateTime, String, func

from app.core.database import Base


class User(Base):
    """
    ORM model to store user information, including email and password hash.
    """
    
    __tablename__ = "users"

    user_id = Column(BigInteger().with_variant(Integer(), "sqlite"), primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User(user_id={self.user_id}, email={self.email})>"
