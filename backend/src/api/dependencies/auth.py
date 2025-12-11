"""Authentication dependencies for FastAPI.

T093: GREEN - Auth dependency with swappable provider pattern.
"""

from typing import Optional

from fastapi import Depends, HTTPException, Request

from src.models.user import UserSession
from src.services.auth_service import get_auth_service, AuthService


def get_token_from_header(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]


async def get_current_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserSession:
    """Dependency to get current authenticated user.

    Raises 401 if not authenticated.
    """
    token = get_token_from_header(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required",
                }
            },
        )

    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or expired token",
                }
            },
        )

    return user


async def get_optional_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> Optional[UserSession]:
    """Dependency to optionally get current user (no error if not authenticated)."""
    token = get_token_from_header(request)
    if not token:
        return None

    return auth_service.get_current_user(token)
