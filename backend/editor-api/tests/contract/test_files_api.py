"""
Contract tests for Files API endpoints.

TDD: T029 - Tests for GET, POST, PUT, DELETE /files endpoints.
These tests define the API contract and should be written before implementation.
"""

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


class TestFilesAPIContract:
    """Contract tests for /api/v1/files endpoints."""

    # =========================================================================
    # GET /api/v1/files - List all files
    # =========================================================================

    def test_list_files_returns_200(self):
        """GET /files should return 200 status code."""
        response = client.get("/api/v1/files")
        assert response.status_code == 200

    def test_list_files_returns_paginated_response(self):
        """GET /files should return paginated response structure."""
        response = client.get("/api/v1/files")
        data = response.json()

        assert "files" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert isinstance(data["files"], list)

    def test_list_files_with_pagination_params(self):
        """GET /files should accept page and page_size query params."""
        response = client.get("/api/v1/files?page=1&page_size=5")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    def test_list_files_with_search_filter(self):
        """GET /files should accept search query param for filtering."""
        response = client.get("/api/v1/files?search=test")
        assert response.status_code == 200

    # =========================================================================
    # POST /api/v1/files - Create new file
    # =========================================================================

    def test_create_file_returns_201(self):
        """POST /files should return 201 status code on success."""
        response = client.post(
            "/api/v1/files",
            json={"name": "test-file", "content": "# Service: Test"}
        )
        assert response.status_code == 201

    def test_create_file_returns_file_data(self):
        """POST /files should return created file data."""
        response = client.post(
            "/api/v1/files",
            json={"name": "contract-test-file", "content": ""}
        )
        data = response.json()

        assert "id" in data
        assert data["name"] == "contract-test-file"
        assert "content" in data
        assert "version" in data
        assert data["version"] == 1
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_file_without_name_returns_422(self):
        """POST /files without name should return 422 validation error."""
        response = client.post(
            "/api/v1/files",
            json={"content": "test content"}
        )
        assert response.status_code == 422

    def test_create_file_with_empty_name_returns_422(self):
        """POST /files with empty name should return 422 validation error."""
        response = client.post(
            "/api/v1/files",
            json={"name": "", "content": "test"}
        )
        assert response.status_code == 422

    def test_create_file_duplicate_name_returns_409(self):
        """POST /files with duplicate name should return 409 conflict."""
        unique_name = f"duplicate-test-{uuid4().hex[:8]}"

        # Create first file
        response1 = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": ""}
        )
        assert response1.status_code == 201

        # Try to create duplicate
        response2 = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": ""}
        )
        assert response2.status_code == 409

    # =========================================================================
    # GET /api/v1/files/{file_id} - Get single file
    # =========================================================================

    def test_get_file_by_id_returns_200(self):
        """GET /files/{id} should return 200 for existing file."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"get-test-{uuid4().hex[:8]}", "content": "test"}
        )
        file_id = create_response.json()["id"]

        # Get the file
        response = client.get(f"/api/v1/files/{file_id}")
        assert response.status_code == 200

    def test_get_file_returns_file_data(self):
        """GET /files/{id} should return complete file data."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"get-data-test-{uuid4().hex[:8]}", "content": "# Service: Test"}
        )
        file_id = create_response.json()["id"]

        # Get the file
        response = client.get(f"/api/v1/files/{file_id}")
        data = response.json()

        assert data["id"] == file_id
        assert "name" in data
        assert data["content"] == "# Service: Test"
        assert "version" in data
        assert "status" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_get_nonexistent_file_returns_404(self):
        """GET /files/{id} should return 404 for non-existent file."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/files/{fake_id}")
        assert response.status_code == 404

    def test_get_file_with_invalid_id_returns_422(self):
        """GET /files/{id} should return 422 for invalid UUID format."""
        response = client.get("/api/v1/files/not-a-uuid")
        assert response.status_code == 422

    # =========================================================================
    # PUT /api/v1/files/{file_id} - Update file
    # =========================================================================

    def test_update_file_returns_200(self):
        """PUT /files/{id} should return 200 on success."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"update-test-{uuid4().hex[:8]}", "content": "original"}
        )
        file_id = create_response.json()["id"]

        # Update the file
        response = client.put(
            f"/api/v1/files/{file_id}",
            json={"content": "updated content"}
        )
        assert response.status_code == 200

    def test_update_file_increments_version(self):
        """PUT /files/{id} should increment version number."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"version-test-{uuid4().hex[:8]}", "content": "v1"}
        )
        file_id = create_response.json()["id"]
        original_version = create_response.json()["version"]

        # Update the file
        response = client.put(
            f"/api/v1/files/{file_id}",
            json={"content": "v2"}
        )
        data = response.json()

        assert data["version"] == original_version + 1
        assert data["content"] == "v2"

    def test_update_file_updates_timestamp(self):
        """PUT /files/{id} should update the updated_at timestamp."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"timestamp-test-{uuid4().hex[:8]}", "content": "original"}
        )
        file_id = create_response.json()["id"]
        original_updated_at = create_response.json()["updated_at"]

        # Update the file
        response = client.put(
            f"/api/v1/files/{file_id}",
            json={"content": "updated"}
        )
        data = response.json()

        assert data["updated_at"] != original_updated_at

    def test_update_nonexistent_file_returns_404(self):
        """PUT /files/{id} should return 404 for non-existent file."""
        fake_id = str(uuid4())
        response = client.put(
            f"/api/v1/files/{fake_id}",
            json={"content": "test"}
        )
        assert response.status_code == 404

    def test_update_file_without_content_returns_422(self):
        """PUT /files/{id} without content should return 422."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"no-content-test-{uuid4().hex[:8]}", "content": "test"}
        )
        file_id = create_response.json()["id"]

        response = client.put(f"/api/v1/files/{file_id}", json={})
        assert response.status_code == 422

    # =========================================================================
    # DELETE /api/v1/files/{file_id} - Delete file (soft delete)
    # =========================================================================

    def test_delete_file_returns_204(self):
        """DELETE /files/{id} should return 204 on success."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"delete-test-{uuid4().hex[:8]}", "content": "to delete"}
        )
        file_id = create_response.json()["id"]

        # Delete the file
        response = client.delete(f"/api/v1/files/{file_id}")
        assert response.status_code == 204

    def test_delete_file_soft_deletes(self):
        """DELETE /files/{id} should soft delete (GET returns 404 after)."""
        # Create a file first
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"soft-delete-test-{uuid4().hex[:8]}", "content": "test"}
        )
        file_id = create_response.json()["id"]

        # Delete the file
        delete_response = client.delete(f"/api/v1/files/{file_id}")
        assert delete_response.status_code == 204

        # Try to get the deleted file
        get_response = client.get(f"/api/v1/files/{file_id}")
        assert get_response.status_code == 404

    def test_delete_nonexistent_file_returns_404(self):
        """DELETE /files/{id} should return 404 for non-existent file."""
        fake_id = str(uuid4())
        response = client.delete(f"/api/v1/files/{fake_id}")
        assert response.status_code == 404

    def test_delete_already_deleted_file_returns_404(self):
        """DELETE /files/{id} should return 404 for already deleted file."""
        # Create and delete a file
        create_response = client.post(
            "/api/v1/files",
            json={"name": f"double-delete-test-{uuid4().hex[:8]}", "content": "test"}
        )
        file_id = create_response.json()["id"]

        # First delete
        client.delete(f"/api/v1/files/{file_id}")

        # Second delete should return 404
        response = client.delete(f"/api/v1/files/{file_id}")
        assert response.status_code == 404


class TestFilesAPIErrorResponses:
    """Test error response formats for Files API."""

    def test_404_error_format(self):
        """404 errors should have proper error response format."""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/files/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert "error" in data or "detail" in data

    def test_422_error_format(self):
        """422 errors should have proper validation error format."""
        response = client.post("/api/v1/files", json={})

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data


class TestFilesAPIHeaders:
    """Test response headers for Files API."""

    def test_response_has_content_type_json(self):
        """All responses should have Content-Type: application/json."""
        response = client.get("/api/v1/files")
        assert "application/json" in response.headers.get("content-type", "")

    def test_response_has_request_id(self):
        """All responses should have X-Request-ID header."""
        response = client.get("/api/v1/files")
        assert "x-request-id" in response.headers
