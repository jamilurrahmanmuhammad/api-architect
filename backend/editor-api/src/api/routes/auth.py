"""Authentication API endpoints."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from src.api.dependencies.auth import get_current_user, get_token_from_header
from src.models.user import LoginRequest, LoginResponse, LogoutResponse, UserSession
from src.services.auth_service import get_auth_service, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _create_meta() -> dict:
    """Create response metadata."""
    return {
        "requestId": str(uuid.uuid4()),
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.post("/login")
async def login(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    """Authenticate user and return token.

    Args:
        request: Login credentials (email, password).

    Returns:
        Token and user session wrapped in API envelope.

    Raises:
        HTTPException: 401 if credentials invalid.
    """
    result = auth_service.login(request)

    if result is None:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password",
                },
                "meta": _create_meta(),
            },
        )

    return {
        "data": {
            "token": result.token,
            "user": result.user.model_dump(),
        },
        "meta": _create_meta(),
    }


@router.get("/me")
async def get_me(
    current_user: UserSession = Depends(get_current_user),
) -> dict:
    """Get current authenticated user.

    Returns:
        User session wrapped in API envelope.
    """
    return {
        "data": current_user.model_dump(),
        "meta": _create_meta(),
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: UserSession = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    """Logout current user and invalidate token.

    Returns:
        Success message wrapped in API envelope.
    """
    token = get_token_from_header(request)
    if token:
        auth_service.logout(token)

    return {
        "data": LogoutResponse().model_dump(),
        "meta": _create_meta(),
    }
