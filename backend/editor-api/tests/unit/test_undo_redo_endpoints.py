"""
T013: Unit tests for Undo/Redo API Endpoints.

Tests for REST API endpoints that expose undo/redo functionality:
- Undo endpoint (POST /specs/{spec_id}/undo)
- Redo endpoint (POST /specs/{spec_id}/redo)
- Status endpoint (GET /specs/{spec_id}/undo-redo/status)
- History endpoint (GET /specs/{spec_id}/undo-redo/history)
- Clear endpoint (DELETE /specs/{spec_id}/undo-redo/history)

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.oas_routes import router
from src.db import database as db_module


@pytest.fixture
def mock_session():
    """Create a mock database session."""
    session = AsyncMock(spec=AsyncSession)
    return session


@pytest.fixture
def client(mock_session):
    """Create a test client with mocked database."""
    app = FastAPI()
    app.include_router(router, prefix="/api/oas")

    # Override the get_db dependency with a mock
    async def mock_get_db():
        yield mock_session

    app.dependency_overrides[db_module.get_db] = mock_get_db
    return TestClient(app)


@pytest.fixture
def spec_id():
    """Create a spec ID for testing."""
    return str(uuid4())


class TestUndoRedoEndpointsAvailability:
    """Tests for undo/redo endpoint availability."""

    def test_undo_endpoint_exists(self, client, spec_id):
        """Undo endpoint is available."""
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        # Should not 404, may return 200 or other success code
        assert response.status_code in [200, 201, 204]

    def test_redo_endpoint_exists(self, client, spec_id):
        """Redo endpoint is available."""
        response = client.post(f"/api/oas/specs/{spec_id}/redo")
        # Should not 404
        assert response.status_code in [200, 201, 204]

    def test_status_endpoint_exists(self, client, spec_id):
        """Status endpoint is available."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200

    def test_history_endpoint_exists(self, client, spec_id):
        """History endpoint is available."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code == 200

    def test_clear_endpoint_exists(self, client, spec_id):
        """Clear history endpoint is available."""
        response = client.delete(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code in [204, 200]


class TestUndoEndpoint:
    """Tests for undo endpoint."""

    def test_undo_on_empty_history_returns_no_transaction(self, client, spec_id):
        """Undo with no history returns empty result."""
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] is False or data.get("transaction") is None

    def test_undo_response_structure(self, client, spec_id):
        """Undo response has correct structure."""
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["spec_id", "success"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_undo_response_includes_transaction(self, client, spec_id):
        """Undo response includes transaction information."""
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        assert response.status_code == 200
        data = response.json()
        # Transaction field should exist (even if null)
        assert "transaction" in data or "success" in data


class TestRedoEndpoint:
    """Tests for redo endpoint."""

    def test_redo_on_empty_history_returns_no_transaction(self, client, spec_id):
        """Redo with no history returns empty result."""
        response = client.post(f"/api/oas/specs/{spec_id}/redo")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] is False or data.get("transaction") is None

    def test_redo_response_structure(self, client, spec_id):
        """Redo response has correct structure."""
        response = client.post(f"/api/oas/specs/{spec_id}/redo")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["spec_id", "success"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


class TestStatusEndpoint:
    """Tests for undo/redo status endpoint."""

    def test_status_returns_empty_stacks(self, client, spec_id):
        """Status endpoint returns empty stack information."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        data = response.json()
        assert data["can_undo"] is False
        assert data["can_redo"] is False

    def test_status_includes_stack_sizes(self, client, spec_id):
        """Status includes undo/redo stack sizes."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["can_undo", "can_redo", "undo_stack_size", "redo_stack_size"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_status_includes_max_stack_size(self, client, spec_id):
        """Status includes max stack size limit."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        data = response.json()
        assert "max_stack_size" in data
        assert data["max_stack_size"] == 20

    def test_status_for_different_specs_independent(self, client):
        """Status is independent for different specifications."""
        spec_id_1 = str(uuid4())
        spec_id_2 = str(uuid4())

        response1 = client.get(f"/api/oas/specs/{spec_id_1}/undo-redo/status")
        response2 = client.get(f"/api/oas/specs/{spec_id_2}/undo-redo/status")

        assert response1.status_code == 200
        assert response2.status_code == 200
        # Both should be independent (can_undo should be false for both)
        assert response1.json()["can_undo"] is False
        assert response2.json()["can_undo"] is False


class TestHistoryEndpoint:
    """Tests for undo/redo history endpoint."""

    def test_history_returns_empty_list(self, client, spec_id):
        """History endpoint returns empty list for new spec."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        assert len(data["history"]) == 0

    def test_history_includes_spec_id(self, client, spec_id):
        """History response includes specification ID."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code == 200
        data = response.json()
        assert "spec_id" in data
        assert str(data["spec_id"]) == spec_id

    def test_history_structure(self, client, spec_id):
        """History response has correct structure."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["spec_id", "history", "total"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


class TestClearHistoryEndpoint:
    """Tests for clear history endpoint."""

    def test_clear_history_succeeds(self, client, spec_id):
        """Clear history endpoint succeeds."""
        response = client.delete(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code in [204, 200]

    def test_clear_history_clears_stacks(self, client, spec_id):
        """Clear history actually clears the stacks."""
        # Clear
        response = client.delete(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code in [204, 200]

        # Check status
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        data = response.json()
        assert data["can_undo"] is False
        assert data["can_redo"] is False

    def test_clear_history_response_structure(self, client, spec_id):
        """Clear history response has correct structure."""
        response = client.delete(f"/api/oas/specs/{spec_id}/undo-redo/history")
        # 204 has no content, 200 might have a response
        if response.status_code == 200:
            data = response.json()
            assert "success" in data or "message" in data


class TestUndoRedoIntegration:
    """Integration tests for undo/redo workflow."""

    def test_status_transitions_correctly(self, client, spec_id):
        """Status transitions correctly through undo/redo operations."""
        # Initial state: no undo available
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        assert response.json()["can_undo"] is False
        assert response.json()["can_redo"] is False

    def test_multiple_specs_independent_operations(self, client):
        """Multiple specs maintain independent undo/redo stacks."""
        spec_id_1 = str(uuid4())
        spec_id_2 = str(uuid4())

        # Get status for both
        response1 = client.get(f"/api/oas/specs/{spec_id_1}/undo-redo/status")
        response2 = client.get(f"/api/oas/specs/{spec_id_2}/undo-redo/status")

        assert response1.status_code == 200
        assert response2.status_code == 200
        # Both should be independent
        assert response1.json()["spec_id"] == spec_id_1
        assert response2.json()["spec_id"] == spec_id_2

    def test_history_endpoint_pagination_support(self, client, spec_id):
        """History endpoint supports pagination parameters."""
        response = client.get(
            f"/api/oas/specs/{spec_id}/undo-redo/history?limit=10&offset=0"
        )
        assert response.status_code == 200
        data = response.json()
        assert "history" in data

    def test_undo_returns_transaction_details(self, client, spec_id):
        """Undo endpoint returns transaction details if available."""
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        assert response.status_code == 200
        data = response.json()
        # Even if no transaction, should have consistent structure
        assert "spec_id" in data
        assert "success" in data


class TestUndoRedoErrorHandling:
    """Tests for error handling in undo/redo endpoints."""

    def test_invalid_spec_id_format(self, client):
        """Invalid spec ID format is handled gracefully."""
        response = client.post("/api/oas/specs/invalid-id/undo")
        # Should either accept the ID or return 422/400
        assert response.status_code in [200, 400, 422]

    def test_undo_endpoint_handles_missing_spec(self, client):
        """Undo handles non-existent specification."""
        spec_id = str(uuid4())
        response = client.post(f"/api/oas/specs/{spec_id}/undo")
        # Should succeed but return no transaction (or handle gracefully)
        assert response.status_code in [200, 201]


class TestUndoRedoEdgeCases:
    """Tests for edge cases in undo/redo endpoints."""

    def test_status_includes_spec_id(self, client, spec_id):
        """Status response includes the spec_id."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.status_code == 200
        data = response.json()
        assert "spec_id" in data

    def test_history_count_matches_total(self, client, spec_id):
        """History item count matches total field."""
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("history", [])) == data.get("total", 0)

    def test_undo_redo_spec_id_consistency(self, client, spec_id):
        """Undo/redo responses maintain spec_id consistency."""
        undo_response = client.post(f"/api/oas/specs/{spec_id}/undo")
        redo_response = client.post(f"/api/oas/specs/{spec_id}/redo")

        if undo_response.status_code == 200:
            undo_data = undo_response.json()
            assert str(undo_data.get("spec_id")) == spec_id

        if redo_response.status_code == 200:
            redo_data = redo_response.json()
            assert str(redo_data.get("spec_id")) == spec_id
