"""
T014: Contract tests for POST /export endpoint.

Tests for Feature 003 - OpenAPI Export.
TDD: Tests written BEFORE implementation.

Tests the export API endpoint:
- Export to OpenAPI 3.0 YAML
- Export to OpenAPI 3.0 JSON
- Export to OpenAPI 3.1 YAML
- Error handling for invalid content
- Response headers (Content-Disposition for download)
"""

import pytest
import json
import yaml
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
def async_client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def valid_dsl():
    """Valid DSL content for testing."""
    return """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API.

## Model: Pet
A pet in the store.

- id (integer, required) - Unique ID
- name (string, required) - Pet name
- status (string) - Pet status

## Operation: GET /pets
List all pets.

**Response**: Pet[]

## Operation: GET /pets/{petId}
Get a pet by ID.

**Response**: Pet

## Error: 404 NotFound
The requested resource was not found.
"""


class TestExportEndpointContract:
    """Contract tests for POST /export endpoint."""

    @pytest.mark.asyncio
    async def test_export_endpoint_exists(self, async_client, valid_dsl):
        """POST /export endpoint should exist."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "yaml", "version": "3.0"}
            )
            # Should not return 404
            assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_export_openapi_30_yaml(self, async_client, valid_dsl):
        """Export to OpenAPI 3.0 YAML format."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "yaml", "version": "3.0"}
            )
            assert response.status_code == 200

            # Content-Type should be YAML
            assert "yaml" in response.headers.get("content-type", "").lower()

            # Response should be valid YAML
            spec = yaml.safe_load(response.text)
            assert spec["openapi"].startswith("3.0")
            assert "info" in spec
            assert spec["info"]["title"] == "Petstore API"
            assert spec["info"]["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_export_openapi_30_json(self, async_client, valid_dsl):
        """Export to OpenAPI 3.0 JSON format."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            assert response.status_code == 200

            # Content-Type should be JSON
            assert "json" in response.headers.get("content-type", "").lower()

            # Response should be valid JSON
            spec = response.json()
            assert spec["openapi"].startswith("3.0")
            assert "info" in spec
            assert spec["info"]["title"] == "Petstore API"

    @pytest.mark.asyncio
    async def test_export_openapi_31_yaml(self, async_client, valid_dsl):
        """Export to OpenAPI 3.1 YAML format."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "yaml", "version": "3.1"}
            )
            assert response.status_code == 200

            spec = yaml.safe_load(response.text)
            assert spec["openapi"].startswith("3.1")

    @pytest.mark.asyncio
    async def test_export_includes_paths(self, async_client, valid_dsl):
        """Export should include paths from operations."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            assert response.status_code == 200

            spec = response.json()
            assert "paths" in spec
            assert "/pets" in spec["paths"]
            assert "/pets/{petId}" in spec["paths"]
            assert "get" in spec["paths"]["/pets"]

    @pytest.mark.asyncio
    async def test_export_includes_schemas(self, async_client, valid_dsl):
        """Export should include schemas from models."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            assert response.status_code == 200

            spec = response.json()
            assert "components" in spec
            assert "schemas" in spec["components"]
            assert "Pet" in spec["components"]["schemas"]

            pet_schema = spec["components"]["schemas"]["Pet"]
            assert "properties" in pet_schema
            assert "id" in pet_schema["properties"]
            assert "name" in pet_schema["properties"]

    @pytest.mark.asyncio
    async def test_export_includes_responses(self, async_client, valid_dsl):
        """Export should include error responses."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            assert response.status_code == 200

            spec = response.json()
            assert "components" in spec
            assert "responses" in spec["components"]
            assert "NotFound" in spec["components"]["responses"]

    @pytest.mark.asyncio
    async def test_export_includes_servers(self, async_client, valid_dsl):
        """Export should include servers from base_path."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            assert response.status_code == 200

            spec = response.json()
            assert "servers" in spec
            assert len(spec["servers"]) >= 1
            assert spec["servers"][0]["url"] == "/api/v1"


class TestExportEndpointErrors:
    """Tests for error handling in export endpoint."""

    @pytest.mark.asyncio
    async def test_export_invalid_format(self, async_client, valid_dsl):
        """Invalid format should return 422 error."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "xml", "version": "3.0"}
            )
            # Should return validation error
            assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_export_invalid_version(self, async_client, valid_dsl):
        """Invalid version should return 422 error."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "yaml", "version": "2.0"}
            )
            # Should return validation error
            assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_export_missing_content(self, async_client):
        """Missing content should return 422 error."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"format": "yaml", "version": "3.0"}
            )
            assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_export_empty_content(self, async_client):
        """Empty content should still export valid minimal spec."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": "", "format": "json", "version": "3.0"}
            )
            # Empty content should either succeed with minimal spec
            # or return 400/422 depending on implementation
            if response.status_code == 200:
                spec = response.json()
                assert "openapi" in spec
            else:
                assert response.status_code in (400, 422)


class TestExportResponseHeaders:
    """Tests for response headers in export endpoint."""

    @pytest.mark.asyncio
    async def test_yaml_content_type(self, async_client, valid_dsl):
        """YAML export should have correct Content-Type."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "yaml", "version": "3.0"}
            )
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                assert "yaml" in content_type.lower() or "text" in content_type.lower()

    @pytest.mark.asyncio
    async def test_json_content_type(self, async_client, valid_dsl):
        """JSON export should have correct Content-Type."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/export",
                json={"content": valid_dsl, "format": "json", "version": "3.0"}
            )
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                assert "json" in content_type.lower()
