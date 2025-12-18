"""Contract tests validating API responses match OpenAPI specification.

T012: RED - Contract test for health endpoint per OpenAPI spec.
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpointContract:
    """Contract tests for /api/v1/health endpoint."""

    @pytest.mark.asyncio
    async def test_health_response_matches_openapi_schema(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Health endpoint response must match HealthResponse schema.

        OpenAPI Schema Requirements:
        - data.status: enum ['healthy', 'degraded', 'unhealthy']
        - data.version: string
        - data.timestamp: datetime ISO8601
        - meta.requestId: uuid format
        - meta.timestamp: datetime ISO8601
        """
        response = await client.get(f"{api_url}/health")

        assert response.status_code == 200
        body = response.json()

        # Verify envelope structure
        assert "data" in body
        assert "meta" in body

        # Verify data schema
        data = body["data"]
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "version" in data
        assert isinstance(data["version"], str)
        assert "timestamp" in data

        # Verify meta schema
        meta = body["meta"]
        assert "requestId" in meta
        assert "timestamp" in meta

    @pytest.mark.asyncio
    async def test_health_endpoint_no_auth_required(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Health endpoint must be accessible without authentication."""
        response = await client.get(f"{api_url}/health")
        # Should not return 401 Unauthorized
        assert response.status_code != 401

    @pytest.mark.asyncio
    async def test_health_response_content_type(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Health endpoint must return application/json content type."""
        response = await client.get(f"{api_url}/health")
        assert response.headers.get("content-type", "").startswith("application/json")


class TestModulesEndpointContract:
    """Contract tests for /api/v1/modules endpoint (T045)."""

    @pytest.mark.asyncio
    async def test_modules_response_matches_openapi_schema(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Modules endpoint response must match ModulesResponse schema.

        OpenAPI Schema Requirements:
        - data: array of Module objects
        - Module: id, name, description, icon, route, enabled, order, badge?
        - meta.requestId: uuid format
        - meta.timestamp: datetime ISO8601
        """
        response = await client.get(f"{api_url}/modules")

        assert response.status_code == 200
        body = response.json()

        # Verify envelope structure
        assert "data" in body
        assert "meta" in body
        assert isinstance(body["data"], list)

        # Verify meta schema
        meta = body["meta"]
        assert "requestId" in meta
        assert "timestamp" in meta

    @pytest.mark.asyncio
    async def test_module_by_id_response_matches_openapi_schema(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Single module endpoint response must match ModuleResponse schema."""
        # First get list to find a valid ID
        list_response = await client.get(f"{api_url}/modules")
        modules = list_response.json()["data"]

        if len(modules) > 0:
            module_id = modules[0]["id"]
            response = await client.get(f"{api_url}/modules/{module_id}")

            assert response.status_code == 200
            body = response.json()

            # Verify envelope structure
            assert "data" in body
            assert "meta" in body

            # Verify module schema
            module = body["data"]
            assert "id" in module
            assert "name" in module
            assert "description" in module
            assert "icon" in module
            assert "route" in module
            assert "enabled" in module
            assert "order" in module


class TestAuthEndpointContract:
    """Contract tests for /api/v1/auth endpoints (T087)."""

    @pytest.mark.asyncio
    async def test_login_response_matches_openapi_schema(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Login endpoint response must match LoginResponse schema."""
        response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        body = response.json()

        # Verify envelope structure
        assert "data" in body
        assert "meta" in body

        # Verify data schema
        data = body["data"]
        assert "token" in data
        assert "user" in data
        assert isinstance(data["token"], str)

    @pytest.mark.asyncio
    async def test_me_response_matches_openapi_schema(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """Current user endpoint response must match UserSessionResponse schema."""
        # Login first
        login_response = await client.post(
            f"{api_url}/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["data"]["token"]

        response = await client.get(
            f"{api_url}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()

        # Verify envelope structure
        assert "data" in body
        assert "meta" in body

        # Verify user session schema
        user = body["data"]
        assert "id" in user
        assert "userId" in user
        assert "email" in user
        assert "isAuthenticated" in user
