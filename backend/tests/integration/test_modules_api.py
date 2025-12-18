"""Integration tests for modules API endpoints.

T046-T047: RED - Integration tests for modules endpoints.
"""

import pytest
from httpx import AsyncClient


class TestModulesAPI:
    """Integration tests for /api/v1/modules endpoints."""

    @pytest.mark.asyncio
    async def test_list_modules_returns_200(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules returns 200 with module list."""
        response = await client.get(f"{api_url}/modules")

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_list_modules_returns_expected_fields(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules returns modules with required fields."""
        response = await client.get(f"{api_url}/modules")

        assert response.status_code == 200
        body = response.json()

        if len(body["data"]) > 0:
            module = body["data"][0]
            assert "id" in module
            assert "name" in module
            assert "description" in module
            assert "icon" in module
            assert "route" in module
            assert "enabled" in module
            assert "order" in module

    @pytest.mark.asyncio
    async def test_list_modules_ordered_by_order_field(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules returns modules sorted by order."""
        response = await client.get(f"{api_url}/modules")

        assert response.status_code == 200
        body = response.json()

        if len(body["data"]) > 1:
            orders = [m["order"] for m in body["data"]]
            assert orders == sorted(orders)

    @pytest.mark.asyncio
    async def test_list_modules_filter_by_enabled(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules?enabled=true returns only enabled modules."""
        response = await client.get(f"{api_url}/modules?enabled=true")

        assert response.status_code == 200
        body = response.json()

        for module in body["data"]:
            assert module["enabled"] is True

    @pytest.mark.asyncio
    async def test_get_module_by_id_returns_200(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules/{moduleId} returns 200 with module."""
        # First get list to find a valid ID
        list_response = await client.get(f"{api_url}/modules")
        modules = list_response.json()["data"]

        if len(modules) > 0:
            module_id = modules[0]["id"]
            response = await client.get(f"{api_url}/modules/{module_id}")

            assert response.status_code == 200
            body = response.json()
            assert body["data"]["id"] == module_id

    @pytest.mark.asyncio
    async def test_get_module_by_id_not_found(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules/{moduleId} returns 404 for unknown ID."""
        response = await client.get(f"{api_url}/modules/nonexistent-module")

        assert response.status_code == 404
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_modules_includes_meta(
        self, client: AsyncClient, api_url: str
    ) -> None:
        """GET /api/v1/modules includes meta in response."""
        response = await client.get(f"{api_url}/modules")

        assert response.status_code == 200
        body = response.json()
        assert "meta" in body
        assert "requestId" in body["meta"]
        assert "timestamp" in body["meta"]
