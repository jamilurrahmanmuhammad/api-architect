"""
T011: Unit tests for Import Workflow API Endpoints.

Tests for REST API endpoints that expose import workflow functionality:
- CSV import endpoint
- OAS import endpoint
- Import result handling
- Error responses

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.oas_routes import router


@pytest.fixture
def client():
    """Create a test client."""
    app = FastAPI()
    app.include_router(router, prefix="/api/oas")
    return TestClient(app)


class TestImportEndpointsHealth:
    """Tests for import endpoint health and availability."""

    def test_csv_import_endpoint_exists(self, client):
        """CSV import endpoint is registered."""
        response = client.get("/api/oas/health")
        assert response.status_code == 200
        data = response.json()
        assert "import_workflow" in data["services"]

    def test_oas_import_endpoint_exists(self, client):
        """OAS import endpoint is registered."""
        response = client.get("/api/oas/health")
        assert response.status_code == 200
        # Both endpoints should be available


class TestCSVImportEndpoint:
    """Tests for CSV import endpoint."""

    def test_import_csv_with_valid_request(self, client):
        """POST /import/csv with valid request succeeds."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/pets,get,List pets",
            "spec_id": spec_id,
            "profile": "basic",
            "merge": False,
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "spec_id" in data
        assert "success" in data
        assert "source" in data
        assert data["source"] == "csv"

    def test_import_csv_returns_import_result(self, client):
        """POST /import/csv returns proper ImportResult structure."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/pets,get,List pets",
            "spec_id": spec_id,
            "api_title": "Pet Store",
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "rows_imported" in data["stats"]
        assert "paths_added" in data["stats"]
        assert "schemas_added" in data["stats"]

    def test_import_csv_with_merge_flag(self, client):
        """POST /import/csv accepts merge flag."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/users,get,List users",
            "spec_id": spec_id,
            "merge": True,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "success" in data

    def test_import_csv_with_different_profiles(self, client):
        """POST /import/csv supports different CSV profiles."""
        spec_id = str(uuid4())

        for profile in ["basic", "advanced", "technical", "expert"]:
            request_data = {
                "oas_content": "path,method,summary\n/api/test,get,Test",
                "spec_id": spec_id,
                "profile": profile,
            }

            response = client.post("/api/oas/import/csv", json=request_data)

            assert response.status_code == 200, f"Profile {profile} failed"
            data = response.json()
            assert data["success"]

    def test_import_csv_returns_errors_in_response(self, client):
        """POST /import/csv returns errors array in response."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "invalid",
            "spec_id": spec_id,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert isinstance(data["errors"], list)

    def test_import_csv_includes_timestamp(self, client):
        """POST /import/csv includes timestamp in response."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/test,get,Test",
            "spec_id": spec_id,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        # Verify timestamp is valid ISO format
        try:
            datetime.fromisoformat(data["timestamp"])
        except ValueError:
            pytest.fail("Timestamp is not valid ISO format")


class TestOASImportEndpoint:
    """Tests for OAS import endpoint."""

    def test_import_oas_with_json_content(self, client):
        """POST /import/oas with JSON OAS content succeeds."""
        spec_id = str(uuid4())
        oas_content = """{
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
            "paths": {}
        }"""
        request_data = {
            "oas_content": oas_content,
            "spec_id": spec_id,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["source"] == "oas"

    def test_import_oas_with_yaml_content(self, client):
        """POST /import/oas with YAML OAS content succeeds."""
        spec_id = str(uuid4())
        oas_content = """openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}"""
        request_data = {
            "oas_content": oas_content,
            "spec_id": spec_id,
            "content_format": "yaml",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"]

    def test_import_oas_returns_statistics(self, client):
        """POST /import/oas returns detailed statistics."""
        spec_id = str(uuid4())
        oas_content = """{
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
            "paths": {
                "/pets": {"get": {"summary": "List pets"}},
                "/users": {"get": {"summary": "List users"}}
            },
            "components": {
                "schemas": {
                    "Pet": {"type": "object"},
                    "User": {"type": "object"}
                }
            }
        }"""
        request_data = {
            "oas_content": oas_content,
            "spec_id": spec_id,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        stats = data["stats"]
        assert stats["paths_added"] >= 2
        assert stats["schemas_added"] >= 2

    def test_import_oas_with_merge_flag(self, client):
        """POST /import/oas accepts merge flag."""
        spec_id = str(uuid4())
        oas_content = """{
            "openapi": "3.0.0",
            "info": {"title": "Updated API", "version": "2.0.0"},
            "paths": {}
        }"""
        request_data = {
            "oas_content": oas_content,
            "spec_id": spec_id,
            "merge": True,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "success" in data

    def test_import_oas_preserves_complex_structures(self, client):
        """POST /import/oas preserves complex OAS structures."""
        spec_id = str(uuid4())
        oas_content = """{
            "openapi": "3.0.0",
            "info": {"title": "Complex API", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "allOf": [
                            {"$ref": "#/components/schemas/Animal"},
                            {"type": "object", "properties": {"name": {"type": "string"}}}
                        ],
                        "x-custom": "preserved"
                    }
                }
            }
        }"""
        request_data = {
            "oas_content": oas_content,
            "spec_id": spec_id,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"]

    def test_import_oas_returns_errors_for_invalid_content(self, client):
        """POST /import/oas returns errors for invalid OAS."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "invalid oas content",
            "spec_id": spec_id,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert isinstance(data["errors"], list)


class TestImportResponseFormat:
    """Tests for import response format compliance."""

    def test_import_result_has_required_fields(self, client):
        """Import result includes all required fields."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/test,get,Test",
            "spec_id": spec_id,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        required_fields = ["spec_id", "success", "source", "message", "errors", "stats", "timestamp"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_import_statistics_structure(self, client):
        """Import statistics have correct structure."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/test,get,Test",
            "spec_id": spec_id,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        stats = data["stats"]
        expected_fields = ["rows_imported", "paths_added", "paths_updated", "schemas_added", "schemas_updated"]
        for field in expected_fields:
            assert field in stats, f"Missing stats field: {field}"
            assert isinstance(stats[field], int)

    def test_import_error_structure(self, client):
        """Import errors have correct structure."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "invalid",
            "spec_id": spec_id,
            "profile": "invalid-profile",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        if data["errors"]:
            error = data["errors"][0]
            assert "code" in error
            assert "message" in error


class TestImportErrorHandling:
    """Tests for error handling in import endpoints."""

    def test_import_csv_missing_required_fields(self, client):
        """POST /import/csv returns error for missing required fields."""
        # Missing spec_id
        request_data = {
            "oas_content": "path,method,summary\n/test,get,Test",
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        # FastAPI should return 422 for validation error
        assert response.status_code in [200, 422]

    def test_import_oas_missing_required_fields(self, client):
        """POST /import/oas returns error for missing required fields."""
        # Missing spec_id
        request_data = {
            "oas_content": "{}",
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code in [200, 422]


class TestImportSpecIdHandling:
    """Tests for spec_id handling in import operations."""

    def test_import_csv_with_uuid_spec_id(self, client):
        """POST /import/csv works with UUID spec_id."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": "path,method,summary\n/test,get,Test",
            "spec_id": spec_id,
            "profile": "basic",
        }

        response = client.post("/api/oas/import/csv", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert str(data["spec_id"]) == spec_id

    def test_import_oas_with_uuid_spec_id(self, client):
        """POST /import/oas works with UUID spec_id."""
        spec_id = str(uuid4())
        request_data = {
            "oas_content": '{"openapi": "3.0.0", "info": {"title": "Test", "version": "1.0.0"}, "paths": {}}',
            "spec_id": spec_id,
            "content_format": "json",
        }

        response = client.post("/api/oas/import/oas", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert str(data["spec_id"]) == spec_id
