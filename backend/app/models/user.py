"""
SQLAlchemy ORM model for the users table.
"""

from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, func

from app.core.database import Base


class User(Base):
    """
    User model representing the users table in the database.
    
    Attributes:
        user_id: Primary key, auto-incremented
        email: Unique email address (used as login identifier)
        password_hash: Bcrypt hashed password
        is_active: Whether the user account is active
        created_at: Timestamp when the user was created
        updated_at: Timestamp when the user was last updated
    """
    __tablename__ = "users"

    user_id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User(user_id={self.user_id}, email={self.email})>"
