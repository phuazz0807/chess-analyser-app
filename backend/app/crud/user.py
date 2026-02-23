"""
CRUD operations for user management.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Retrieve a user by their email address.
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.email == email.lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Retrieve a user by their ID.
    
    Args:
        db: Database session
        user_id: User's ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        user_in: User creation schema with email and password
        
    Returns:
        The newly created User object
    """
    hashed_password = get_password_hash(user_in.password)
    
    db_user = User(
        email=user_in.email.lower(),
        password_hash=hashed_password,
        is_active=True,
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user by email and password.
    
    Args:
        db: Database session
        email: User's email address
        password: Plain text password to verify
        
    Returns:
        User object if authentication succeeds, None otherwise
    """
    user = get_user_by_email(db, email)
    
    if user is None:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    if not user.is_active:
        return None
    
    return user
