"""
Contract tests for Validation API endpoints.

TDD: T046 - Tests for POST /validate endpoint.
These tests define the API contract and should be written before implementation.
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


class TestValidateAPIContract:
    """Contract tests for /api/v1/validate endpoint."""

    # =========================================================================
    # POST /api/v1/validate - Validate DSL content
    # =========================================================================

    def test_validate_returns_200_for_valid_dsl(self):
        """POST /validate should return 200 for valid DSL content."""
        valid_dsl = """# Service: Test API
version: 1.0.0
base_path: /api/v1

A sample API for testing.

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": valid_dsl}
        )
        assert response.status_code == 200

    def test_validate_returns_validation_result_structure(self):
        """POST /validate should return proper validation result structure."""
        valid_dsl = """# Service: Test API
version: 1.0.0
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": valid_dsl}
        )
        data = response.json()

        assert "valid" in data
        assert "errors" in data
        assert "error_count" in data
        assert "warning_count" in data
        assert isinstance(data["valid"], bool)
        assert isinstance(data["errors"], list)

    def test_validate_returns_valid_true_for_correct_dsl(self):
        """POST /validate should return valid: true for correct DSL."""
        valid_dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A Pet Store API.

## Model: Pet
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |

## Operation: GET /pets
List all pets.

**Response**: Pet[]
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": valid_dsl}
        )
        data = response.json()

        assert data["valid"] is True
        assert data["error_count"] == 0
        assert len(data["errors"]) == 0

    def test_validate_returns_valid_false_for_invalid_dsl(self):
        """POST /validate should return valid: false for invalid DSL."""
        invalid_dsl = """# Service: Bad API

## Operation: GET /pets
**Response**: UndefinedModel
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": invalid_dsl}
        )
        data = response.json()

        assert data["valid"] is False
        assert data["error_count"] > 0

    def test_validate_returns_error_details(self):
        """POST /validate should return detailed error information."""
        invalid_dsl = """# Service: Bad API

## Operation: GET /pets
**Response**: UndefinedModel
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": invalid_dsl}
        )
        data = response.json()

        # At least one error should be present
        assert len(data["errors"]) > 0

        # Each error should have required fields
        error = data["errors"][0]
        assert "line" in error
        assert "column" in error
        assert "message" in error
        assert "error_type" in error
        assert "severity" in error

    def test_validate_error_includes_line_and_column(self):
        """POST /validate errors should include line and column numbers."""
        invalid_dsl = """# Service: Bad API

## Operation: GET /pets
**Response**: MissingModel
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": invalid_dsl}
        )
        data = response.json()

        if data["errors"]:
            error = data["errors"][0]
            assert isinstance(error["line"], int)
            assert isinstance(error["column"], int)
            assert error["line"] >= 1
            assert error["column"] >= 1

    def test_validate_without_content_returns_422(self):
        """POST /validate without content should return 422."""
        response = client.post(
            "/api/v1/validate",
            json={}
        )
        assert response.status_code == 422

    def test_validate_with_empty_content_returns_200(self):
        """POST /validate with empty content should return 200 (empty is valid)."""
        response = client.post(
            "/api/v1/validate",
            json={"content": ""}
        )
        assert response.status_code == 200

    def test_validate_detects_duplicate_models(self):
        """POST /validate should detect duplicate model names."""
        dsl_with_duplicates = """# Service: Test API
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |

## Model: User
| name | type | required |
|------|------|----------|
| name | string | true |
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": dsl_with_duplicates}
        )
        data = response.json()

        assert data["valid"] is False
        assert any("duplicate" in e["message"].lower() for e in data["errors"])

    def test_validate_detects_invalid_field_types(self):
        """POST /validate should detect invalid field types."""
        dsl_with_invalid_type = """# Service: Test API
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | invalidtype | true |
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": dsl_with_invalid_type}
        )
        data = response.json()

        assert data["valid"] is False
        assert any("type" in e["message"].lower() for e in data["errors"])

    def test_validate_detects_undefined_model_references(self):
        """POST /validate should detect undefined model references."""
        dsl_with_undefined_ref = """# Service: Test API
version: 1.0.0

## Operation: GET /users
**Response**: NonExistentModel
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": dsl_with_undefined_ref}
        )
        data = response.json()

        assert data["valid"] is False
        assert any("undefined" in e["message"].lower() or "reference" in e["message"].lower()
                   for e in data["errors"])

    def test_validate_returns_multiple_errors(self):
        """POST /validate should return all validation errors, not just first."""
        dsl_with_multiple_errors = """# Service: Bad API

## Model: User
| name | type | required |
|------|------|----------|
| id | badtype1 | true |
| name | badtype2 | true |

## Operation: GET /users
**Response**: MissingModel
"""
        response = client.post(
            "/api/v1/validate",
            json={"content": dsl_with_multiple_errors}
        )
        data = response.json()

        assert data["valid"] is False
        # Should have multiple errors collected
        assert len(data["errors"]) >= 2

    def test_validate_accepts_json_content_type(self):
        """POST /validate should accept application/json content type."""
        response = client.post(
            "/api/v1/validate",
            json={"content": "# Service: Test\nversion: 1.0.0"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200


class TestValidateAPIErrorHandling:
    """Contract tests for validation API error handling."""

    def test_validate_with_malformed_json_returns_422(self):
        """POST /validate with malformed JSON should return 422."""
        response = client.post(
            "/api/v1/validate",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    def test_validate_with_wrong_content_type_returns_error(self):
        """POST /validate with wrong content type should return error."""
        response = client.post(
            "/api/v1/validate",
            content="content=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        # Should return 415 or 422 for unsupported media type
        assert response.status_code in [415, 422]

    def test_validate_returns_json_response(self):
        """POST /validate should always return JSON response."""
        response = client.post(
            "/api/v1/validate",
            json={"content": "# Test"}
        )
        assert response.headers.get("content-type", "").startswith("application/json")
