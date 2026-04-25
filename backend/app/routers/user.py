"""
User router with endpoints for user profile.
"""

from typing import Annotated
from fastapi import APIRouter, Depends
from app.routers.auth import get_current_user
from app.schemas.user import UserOut, UserProfileOut

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/profile", response_model=UserProfileOut)
async def get_profile(
    current_user: Annotated[UserOut, Depends(get_current_user)],
):
    """
    Get the current authenticated user's profile.

    Returns email and a masked password string.
    Requires valid JWT token in Authorization header.
    """
    return UserProfileOut(email=current_user.email)