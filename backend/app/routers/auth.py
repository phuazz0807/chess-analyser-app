"""
Authentication router with endpoints for registration, login, and user info.
"""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token
from app.crud.user import authenticate_user, create_user, get_user_by_email
from app.schemas.user import MessageResponse, Token, UserCreate, UserLogin, UserOut

settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# OAuth2 scheme for JWT token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> UserOut:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    email = decode_access_token(token)
    if email is None:
        raise credentials_exception
    
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    
    return UserOut.model_validate(user)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.
    
    - **email**: Valid email address (must be unique)
    - **password**: Must be at least 8 characters, contain uppercase, digit, and special character
    
    Returns success message on successful registration.
    """
    # Check if email already exists
    existing_user = get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )
    
    # Create the user (password validation happens in schema)
    create_user(db, user_in)
    
    return MessageResponse(message="Registration successful. Please log in.")


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return JWT access token.
    
    - **email**: User's registered email
    - **password**: User's password
    
    Returns JWT token on successful authentication.
    """
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: Annotated[UserOut, Depends(get_current_user)],
):
    """
    Get the current authenticated user's information.
    
    Requires valid JWT token in Authorization header.
    """
    return current_user
