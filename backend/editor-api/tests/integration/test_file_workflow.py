"""
Integration tests for file workflow.

TDD: T030 - Tests for create → save → load flow.
Tests the complete workflow from file creation through editing to persistence.
"""

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


class TestFileWorkflow:
    """Integration tests for complete file workflows."""

    def test_create_save_load_workflow(self):
        """
        Test complete workflow: Create file → Save content → Load and verify.

        This tests the primary user story flow:
        1. User creates a new file with a name
        2. User adds DSL content and saves
        3. User reloads the file and sees persisted content
        """
        # Step 1: Create a new file
        unique_name = f"workflow-test-{uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": ""}
        )
        assert create_response.status_code == 201
        file_data = create_response.json()
        file_id = file_data["id"]
        assert file_data["name"] == unique_name
        assert file_data["version"] == 1

        # Step 2: Update the file with DSL content
        dsl_content = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API.

## Model: Pet
A pet in the store.

| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |
"""
        update_response = client.put(
            f"/api/v1/files/{file_id}",
            json={"content": dsl_content}
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["version"] == 2
        assert updated_data["content"] == dsl_content

        # Step 3: Reload the file and verify persistence
        load_response = client.get(f"/api/v1/files/{file_id}")
        assert load_response.status_code == 200
        loaded_data = load_response.json()

        assert loaded_data["id"] == file_id
        assert loaded_data["name"] == unique_name
        assert loaded_data["content"] == dsl_content
        assert loaded_data["version"] == 2

    def test_multiple_edits_increment_version(self):
        """Test that multiple edits correctly increment the version."""
        # Create file
        unique_name = f"version-workflow-{uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": "v1"}
        )
        file_id = create_response.json()["id"]
        assert create_response.json()["version"] == 1

        # Edit multiple times
        for i in range(2, 6):
            update_response = client.put(
                f"/api/v1/files/{file_id}",
                json={"content": f"v{i}"}
            )
            assert update_response.status_code == 200
            assert update_response.json()["version"] == i

        # Verify final state
        final_response = client.get(f"/api/v1/files/{file_id}")
        assert final_response.json()["version"] == 5
        assert final_response.json()["content"] == "v5"

    def test_create_delete_cannot_load_workflow(self):
        """Test that deleted files cannot be loaded."""
        # Create file
        unique_name = f"delete-workflow-{uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": "to be deleted"}
        )
        file_id = create_response.json()["id"]

        # Delete file
        delete_response = client.delete(f"/api/v1/files/{file_id}")
        assert delete_response.status_code == 204

        # Try to load - should fail
        load_response = client.get(f"/api/v1/files/{file_id}")
        assert load_response.status_code == 404

    def test_file_appears_in_list_after_creation(self):
        """Test that newly created files appear in the file list."""
        # Create a uniquely named file
        unique_name = f"list-workflow-{uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": ""}
        )
        assert create_response.status_code == 201
        file_id = create_response.json()["id"]

        # List files and verify the new file is present
        list_response = client.get("/api/v1/files")
        assert list_response.status_code == 200
        files = list_response.json()["files"]

        file_ids = [f["id"] for f in files]
        assert file_id in file_ids

    def test_file_disappears_from_list_after_deletion(self):
        """Test that deleted files don't appear in the file list."""
        # Create a file
        unique_name = f"disappear-workflow-{uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": ""}
        )
        file_id = create_response.json()["id"]

        # Verify it's in the list
        list_before = client.get("/api/v1/files")
        file_ids_before = [f["id"] for f in list_before.json()["files"]]
        assert file_id in file_ids_before

        # Delete the file
        client.delete(f"/api/v1/files/{file_id}")

        # Verify it's no longer in the list
        list_after = client.get("/api/v1/files")
        file_ids_after = [f["id"] for f in list_after.json()["files"]]
        assert file_id not in file_ids_after

    def test_concurrent_file_operations(self):
        """Test that multiple files can be managed independently."""
        # Create multiple files
        files_created = []
        for i in range(3):
            unique_name = f"concurrent-{i}-{uuid4().hex[:8]}"
            response = client.post(
                "/api/v1/files",
                json={"name": unique_name, "content": f"file {i}"}
            )
            assert response.status_code == 201
            files_created.append(response.json())

        # Update each file independently
        for i, file_data in enumerate(files_created):
            response = client.put(
                f"/api/v1/files/{file_data['id']}",
                json={"content": f"updated file {i}"}
            )
            assert response.status_code == 200

        # Verify each file has correct content
        for i, file_data in enumerate(files_created):
            response = client.get(f"/api/v1/files/{file_data['id']}")
            assert response.status_code == 200
            assert response.json()["content"] == f"updated file {i}"

        # Delete one file - others should remain
        client.delete(f"/api/v1/files/{files_created[1]['id']}")

        # Verify first and third files still exist
        assert client.get(f"/api/v1/files/{files_created[0]['id']}").status_code == 200
        assert client.get(f"/api/v1/files/{files_created[2]['id']}").status_code == 200
        assert client.get(f"/api/v1/files/{files_created[1]['id']}").status_code == 404


class TestFileWorkflowWithDSLContent:
    """Integration tests with realistic DSL content."""

    def test_complete_api_spec_workflow(self):
        """Test workflow with a complete realistic API specification."""
        unique_name = f"complete-spec-{uuid4().hex[:8]}"

        # Create file with initial content
        initial_content = "# Service: MyAPI"
        create_response = client.post(
            "/api/v1/files",
            json={"name": unique_name, "content": initial_content}
        )
        assert create_response.status_code == 201
        file_id = create_response.json()["id"]

        # Build up the spec incrementally (simulating user typing)
        full_spec = """# Service: MyAPI
version: 2.0.0
base_path: /api/v2

A comprehensive API service.

## Model: User
A user in the system.

| name | type | required | description |
|------|------|----------|-------------|
| id | integer | true | Unique user ID |
| email | string | true | User email address |
| name | string | true | Full name |
| role | string | false | User role |

## Model: Product
A product in the catalog.

| name | type | required | description |
|------|------|----------|-------------|
| id | integer | true | Product ID |
| name | string | true | Product name |
| price | number | true | Price in USD |
| stock | integer | false | Available stock |

## Operation: GET /users
List all users.

**Response**: User[]

## Operation: POST /users
Create a new user.

**Request**: User
**Response**: User
**Errors**: 400 ValidationError

## Operation: GET /products/{id}
Get a product by ID.

**Response**: Product
**Errors**: 404 NotFound

## Error: 400 ValidationError
Invalid request data.

## Error: 404 NotFound
Resource not found."""

        # Save the complete spec
        update_response = client.put(
            f"/api/v1/files/{file_id}",
            json={"content": full_spec}
        )
        assert update_response.status_code == 200

        # Reload and verify
        load_response = client.get(f"/api/v1/files/{file_id}")
        assert load_response.status_code == 200
        assert load_response.json()["content"] == full_spec
        assert "## Model: User" in load_response.json()["content"]
        assert "## Operation: GET /users" in load_response.json()["content"]
