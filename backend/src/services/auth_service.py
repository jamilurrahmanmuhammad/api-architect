"""Authentication service with mock implementation.

T092: GREEN - AuthService with mock auth (swappable provider design).
"""

import secrets
from datetime import datetime
from typing import Optional, Protocol

from src.models.user import LoginRequest, LoginResponse, UserSession, UserPreferences


class AuthProvider(Protocol):
    """Protocol for swappable auth providers (FR-015)."""

    def authenticate(self, email: str, password: str) -> Optional[UserSession]:
        """Authenticate user and return session if valid."""
        ...

    def validate_token(self, token: str) -> Optional[UserSession]:
        """Validate token and return session if valid."""
        ...

    def invalidate_token(self, token: str) -> bool:
        """Invalidate token (logout)."""
        ...


class MockAuthProvider:
    """Mock authentication provider for development.

    Can be swapped with OAuth2/OIDC provider in production.
    """

    def __init__(self) -> None:
        # In-memory token store (mock)
        self._tokens: dict[str, UserSession] = {}
        # Mock user database
        self._users = {
            "test@example.com": {
                "userId": "user-001",
                "name": "Test User",
                "password": "password123",
            },
            "admin@example.com": {
                "userId": "user-002",
                "name": "Admin User",
                "password": "admin123",
            },
        }

    def authenticate(self, email: str, password: str) -> Optional[UserSession]:
        """Authenticate user with mock credentials."""
        user = self._users.get(email)
        if not user or user["password"] != password:
            return None

        session = UserSession(
            id=f"session-{secrets.token_hex(8)}",
            userId=user["userId"],
            name=user["name"],
            email=email,
            isAuthenticated=True,
            preferences=UserPreferences(theme="system"),
            createdAt=datetime.now(),
        )
        return session

    def validate_token(self, token: str) -> Optional[UserSession]:
        """Validate token from in-memory store."""
        return self._tokens.get(token)

    def invalidate_token(self, token: str) -> bool:
        """Remove token from in-memory store."""
        if token in self._tokens:
            del self._tokens[token]
            return True
        return False

    def create_token(self, session: UserSession) -> str:
        """Create and store a new token."""
        token = f"mock-token-{secrets.token_hex(16)}"
        self._tokens[token] = session
        return token


class AuthService:
    """Service for authentication operations.

    Uses pluggable provider pattern for easy swapping between
    mock auth and OAuth2/OIDC in production.
    """

    def __init__(self, provider: Optional[MockAuthProvider] = None) -> None:
        self._provider = provider or MockAuthProvider()

    def login(self, request: LoginRequest) -> Optional[LoginResponse]:
        """Authenticate user and return login response with token."""
        session = self._provider.authenticate(request.email, request.password)
        if not session:
            return None

        token = self._provider.create_token(session)
        return LoginResponse(token=token, user=session)

    def get_current_user(self, token: str) -> Optional[UserSession]:
        """Get current user session from token."""
        return self._provider.validate_token(token)

    def logout(self, token: str) -> bool:
        """Invalidate token and logout user."""
        return self._provider.invalidate_token(token)


# Singleton instance
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    """Get or create auth service singleton."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
