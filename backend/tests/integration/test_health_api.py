"""Integration tests for health check endpoints.

T013: RED - Integration test for GET /api/v1/health returning 200 + healthy status.
"""

import pytest
from httpx import AsyncClient


class TestHealthAPI:
    """Integration tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_returns_200_with_healthy_status(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health returns 200 with status='healthy'."""
        response = await client.get(f"{api_url}/health")

        assert response.status_code == 200
        body = response.json()
        assert body["data"]["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_returns_version(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health includes application version."""
        response = await client.get(f"{api_url}/health")

        assert response.status_code == 200
        body = response.json()
        assert "version" in body["data"]
        assert body["data"]["version"] == "0.1.0"

    @pytest.mark.asyncio
    async def test_health_returns_timestamp(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health includes timestamp."""
        response = await client.get(f"{api_url}/health")

        assert response.status_code == 200
        body = response.json()
        assert "timestamp" in body["data"]

    @pytest.mark.asyncio
    async def test_health_includes_request_id(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health includes unique request ID in meta."""
        response = await client.get(f"{api_url}/health")

        assert response.status_code == 200
        body = response.json()
        assert "meta" in body
        assert "requestId" in body["meta"]

    @pytest.mark.asyncio
    async def test_health_response_time_under_200ms(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health responds within 200ms (SC-010)."""
        import time

        start = time.perf_counter()
        response = await client.get(f"{api_url}/health")
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200
        assert elapsed_ms < 200, f"Health check took {elapsed_ms:.2f}ms, expected < 200ms"

    @pytest.mark.asyncio
    async def test_readiness_returns_200_when_ready(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health/ready returns 200 when service is ready (T117)."""
        response = await client.get(f"{api_url}/health/ready")

        assert response.status_code == 200
        body = response.json()
        assert body["data"]["status"] == "ready"

    @pytest.mark.asyncio
    async def test_readiness_includes_checks(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/health/ready includes dependency checks."""
        response = await client.get(f"{api_url}/health/ready")

        assert response.status_code == 200
        body = response.json()
        assert "checks" in body["data"]
