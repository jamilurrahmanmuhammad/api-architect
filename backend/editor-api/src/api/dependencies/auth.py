"""Authentication dependencies."""

from fastapi import Depends, HTTPException, Request

from src.models.user import UserSession
from src.services.auth_service import AuthService, get_auth_service


def get_token_from_header(request: Request) -> str:
    """Extract token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    return auth_header[7:]  # Remove "Bearer " prefix


async def get_current_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserSession:
    """Get current authenticated user from token."""
    try:
        token = get_token_from_header(request)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user
