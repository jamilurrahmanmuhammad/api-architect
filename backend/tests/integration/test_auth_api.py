"""Integration tests for auth API endpoints.

T088-T090: RED - Integration tests for auth endpoints.
"""

import pytest
from httpx import AsyncClient


class TestAuthAPI:
    """Integration tests for /api/v1/auth endpoints."""

    @pytest.mark.asyncio
    async def test_login_returns_200_with_valid_credentials(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """POST /api/v1/auth/login returns 200 with valid credentials."""
        response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert "token" in body["data"]
        assert "user" in body["data"]

    @pytest.mark.asyncio
    async def test_login_returns_user_session(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """POST /api/v1/auth/login returns user session with required fields."""
        response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        body = response.json()
        user = body["data"]["user"]

        assert "id" in user
        assert "userId" in user
        assert "name" in user
        assert "email" in user
        assert user["email"] == "test@example.com"
        assert "isAuthenticated" in user
        assert user["isAuthenticated"] is True

    @pytest.mark.asyncio
    async def test_login_returns_401_with_invalid_credentials(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """POST /api/v1/auth/login returns 401 with invalid credentials."""
        response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "INVALID_CREDENTIALS"

    @pytest.mark.asyncio
    async def test_me_returns_200_with_valid_token(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/auth/me returns 200 with valid auth token."""
        # First login to get token
        login_response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["data"]["token"]

        # Then get current user
        response = await client.get(
            f"{api_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["data"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_me_returns_401_without_token(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/auth/me returns 401 without auth token."""
        response = await client.get(f"{api_url}/auth/me")

        assert response.status_code == 401
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "UNAUTHORIZED"

    @pytest.mark.asyncio
    async def test_logout_returns_200(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """POST /api/v1/auth/logout returns 200."""
        # First login to get token
        login_response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["data"]["token"]

        # Then logout
        response = await client.post(
            f"{api_url}/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert "message" in body["data"]

    @pytest.mark.asyncio
    async def test_logout_invalidates_token(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """POST /api/v1/auth/logout invalidates the token."""
        # Login
        login_response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["data"]["token"]

        # Logout
        await client.post(
            f"{api_url}/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Try to use token again
        response = await client.get(
            f"{api_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Token should be invalid after logout
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_auth_includes_meta(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Auth endpoints include meta in response."""
        response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        body = response.json()
        assert "meta" in body
        assert "requestId" in body["meta"]
        assert "timestamp" in body["meta"]
