"""
T059: Contract tests for POST /parse endpoint.

Tests the parsing API endpoint that returns ParsedRequirements including:
- Services, Models, Operations, Errors
- Source locations for bidirectional selection
- Parse errors for invalid sections
- Incremental parsing (valid entities even with errors)
"""

import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
def async_client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


class TestParseEndpointContract:
    """Contract tests for POST /parse endpoint."""

    @pytest.mark.asyncio
    async def test_parse_endpoint_exists(self, async_client):
        """POST /parse endpoint should exist."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": ""}
            )
            # Should not return 404
            assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_parse_empty_content(self, async_client):
        """Empty content should return empty results."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": ""}
            )
            assert response.status_code == 200
            data = response.json()

            assert "services" in data
            assert "models" in data
            assert "operations" in data
            assert "errors" in data
            assert "parse_errors" in data
            assert data["services"] == []
            assert data["models"] == []

    @pytest.mark.asyncio
    async def test_parse_valid_service(self, async_client):
        """Valid service should be parsed and returned."""
        dsl = """# Service: TestAPI
version: 1.0.0
base_path: /api/v1
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            assert len(data["services"]) == 1
            service = data["services"][0]
            assert service["name"] == "TestAPI"
            assert service["version"] == "1.0.0"
            assert service["base_path"] == "/api/v1"

    @pytest.mark.asyncio
    async def test_parse_valid_model(self, async_client):
        """Valid model should be parsed with fields."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
| email | string | true |
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            assert len(data["models"]) == 1
            model = data["models"][0]
            assert model["name"] == "User"
            assert len(model["fields"]) == 2

    @pytest.mark.asyncio
    async def test_parse_valid_operation(self, async_client):
        """Valid operation should be parsed."""
        dsl = """# Service: Test
version: 1.0.0

## Operation: GET /users
List all users.
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            assert len(data["operations"]) == 1
            op = data["operations"][0]
            assert op["method"] == "GET"
            assert op["path"] == "/users"

    @pytest.mark.asyncio
    async def test_parse_valid_error(self, async_client):
        """Valid error definition should be parsed."""
        dsl = """# Service: Test
version: 1.0.0

## Error: 404 NotFound
Resource not found.
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            assert len(data["errors"]) == 1
            err = data["errors"][0]
            assert err["status_code"] == 404
            assert err["name"] == "NotFound"


class TestParseResponseStructure:
    """Tests for parse response structure."""

    @pytest.mark.asyncio
    async def test_response_includes_valid_entities_count(self, async_client):
        """Response should include valid_entities count."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            data = response.json()
            assert "valid_entities" in data
            assert data["valid_entities"] == 2  # 1 service + 1 model

    @pytest.mark.asyncio
    async def test_response_includes_total_errors(self, async_client):
        """Response should include total_errors count."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": "# Service: Test\nversion: 1.0.0"}
            )
            data = response.json()
            assert "total_errors" in data

    @pytest.mark.asyncio
    async def test_entities_include_location(self, async_client):
        """All entities should include source location."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            data = response.json()

            # Service should have location
            assert "location" in data["services"][0]
            assert "line" in data["services"][0]["location"]

            # Model should have location
            assert "location" in data["models"][0]
            assert "line" in data["models"][0]["location"]


class TestIncrementalParsing:
    """Tests for incremental/best-effort parsing."""

    @pytest.mark.asyncio
    async def test_parse_returns_valid_entities_despite_errors(self, async_client):
        """Valid entities should be returned even with parse errors."""
        dsl = """# Service: Test
version: 1.0.0

## Model: ValidModel
| name | type | required |
|------|------|----------|
| id | integer | true |

## Some invalid section

## Model: AnotherValid
| name | type | required |
|------|------|----------|
| id | integer | true |
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            # Should have valid entities
            assert len(data["services"]) >= 1
            assert len(data["models"]) >= 1


class TestComplexParsing:
    """Tests for complex DSL documents."""

    @pytest.mark.asyncio
    async def test_parse_complete_api_spec(self, async_client):
        """Complete API spec should be fully parsed."""
        dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

## Model: Pet
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |

## Model: Category
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |

## Operation: GET /pets
List all pets.

## Operation: POST /pets
Add a pet.

## Error: 404 NotFound
Pet not found.
"""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": dsl}
            )
            assert response.status_code == 200
            data = response.json()

            assert len(data["services"]) == 1
            assert len(data["models"]) == 2
            assert len(data["operations"]) == 2
            assert len(data["errors"]) == 1
            assert data["valid_entities"] == 6


class TestParseErrorHandling:
    """Tests for error handling in parse endpoint."""

    @pytest.mark.asyncio
    async def test_missing_content_field(self, async_client):
        """Missing content field should return error."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={}
            )
            assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_invalid_json_body(self, async_client):
        """Invalid JSON body should return error."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                content="not json",
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_null_content(self, async_client):
        """Null content should be handled gracefully."""
        async with async_client as client:
            response = await client.post(
                "/api/v1/parse",
                json={"content": None}
            )
            # Should either error or return empty
            assert response.status_code in [200, 400, 422]
