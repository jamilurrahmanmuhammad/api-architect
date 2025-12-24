"""
T005: Unit tests for OAS Merge Service.

Tests for surgical editing with transaction merging,
preserving untouched structures while applying edits.

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import UUID
from datetime import datetime

from src.services.oas_merge_service import OASMergeService, MergeResult
from src.db.migrations.migration_001_create_oas_specs_table import OASEditTransaction


# Test fixtures
@pytest.fixture
def merge_service():
    """Create OASMergeService instance."""
    return OASMergeService()


@pytest.fixture
def minimal_oas_yaml():
    """Minimal OAS 3.0 document."""
    return """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List pets
      responses:
        '200':
          description: Success
"""


@pytest.fixture
def full_oas_yaml():
    """Complete OAS 3.0 document."""
    return """
openapi: 3.0.0
info:
  title: Pet Store API
  version: 1.0.0
  description: A pet store API
servers:
  - url: https://api.example.com
    description: Production
  - url: https://staging.example.com
    description: Staging
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: A list of pets
components:
  schemas:
    Pet:
      type: object
      required:
        - name
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          type: string
          enum:
            - available
            - pending
"""


def create_transaction(
    spec_id: UUID,
    edit_path: str,
    old_value: str = None,
    new_value: str = None,
    change_type: str = "update",
) -> OASEditTransaction:
    """Helper to create OASEditTransaction."""
    txn = OASEditTransaction()
    txn.spec_id = spec_id
    txn.edit_path = edit_path
    txn.old_value = old_value
    txn.new_value = new_value
    txn.change_type = change_type
    txn.timestamp = datetime.utcnow()
    txn.id = UUID("12345678-1234-5678-1234-567812345678")
    return txn


class TestMergeResultBasics:
    """Tests for MergeResult class."""

    def test_create_merge_result(self):
        """Create a merge result."""
        oas = {"openapi": "3.0.0", "info": {"title": "Test"}, "paths": {}}
        result = MergeResult(merged_oas=oas, edits_applied=3)

        assert result.merged_oas == oas
        assert result.edits_applied == 3
        assert len(result.edits_failed) == 0

    def test_merge_result_with_failures(self):
        """Merge result with failed edits."""
        oas = {"openapi": "3.0.0"}
        result = MergeResult(
            merged_oas=oas,
            edits_applied=2,
            edits_failed=["Transaction 1 failed", "Transaction 2 failed"],
        )

        assert result.edits_applied == 2
        assert len(result.edits_failed) == 2

    def test_merge_result_to_yaml(self):
        """Convert merge result to YAML."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
            "paths": {},
        }
        result = MergeResult(merged_oas=oas)
        yaml_str = result.to_yaml()

        assert "openapi:" in yaml_str
        assert "Test API" in yaml_str

    def test_merge_result_to_json(self):
        """Convert merge result to JSON."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
        }
        result = MergeResult(merged_oas=oas)
        json_str = result.to_json()

        assert '"openapi"' in json_str
        assert '"Test API"' in json_str


class TestOASMergeBasic:
    """Tests for basic merge operations."""

    def test_merge_with_no_transactions(self, merge_service, minimal_oas_yaml):
        """Merge with no transactions returns unchanged OAS."""
        result = merge_service.merge(minimal_oas_yaml, [])

        assert result.edits_applied == 0
        assert len(result.edits_failed) == 0
        assert "Test API" in result.to_yaml()

    def test_merge_invalid_yaml(self, merge_service):
        """Merge fails gracefully for invalid YAML."""
        invalid_yaml = "{ this is not valid yaml: [incomplete"
        result = merge_service.merge(invalid_yaml, [])

        assert result.edits_applied == 0
        assert len(result.edits_failed) > 0

    def test_merge_json_format(self, merge_service):
        """Merge can parse JSON format."""
        json_oas = '{"openapi":"3.0.0","info":{"title":"Test","version":"1.0.0"},"paths":{}}'
        result = merge_service.merge(json_oas, [], content_format="json")

        assert result.edits_applied == 0
        assert "Test" in result.to_json()


class TestOASMergeUpdate:
    """Tests for update transactions."""

    def test_merge_update_string_field(self, merge_service, minimal_oas_yaml):
        """Update a string field."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Test API",
            new_value='"Updated API Title"',  # JSON string
            change_type="update",
        )

        result = merge_service.merge(minimal_oas_yaml, [txn])

        assert result.edits_applied == 1
        assert len(result.edits_failed) == 0
        assert "Updated API Title" in result.to_yaml()

    def test_merge_update_preserves_untouched(self, merge_service, full_oas_yaml):
        """Update preserves untouched fields."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")

        # Change only the title
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Pet Store API",
            new_value='"New Pet API"',
            change_type="update",
        )

        result = merge_service.merge(full_oas_yaml, [txn])

        # Title should be updated
        assert "New Pet API" in result.to_yaml()
        # But description should be unchanged
        assert "A pet store API" in result.to_yaml()
        # And servers should be unchanged
        assert "Production" in result.to_yaml()

    def test_merge_update_numeric_field(self, merge_service, minimal_oas_yaml):
        """Update a numeric field."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/x-internal-id",
            old_value=None,
            new_value="42",  # Numeric value
            change_type="update",
        )

        result = merge_service.merge(minimal_oas_yaml, [txn])

        assert result.edits_applied == 1
        yaml_result = result.to_yaml()
        assert "x-internal-id:" in yaml_result

    def test_merge_update_nested_field(self, merge_service, full_oas_yaml):
        """Update a deeply nested field."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/components/schemas/Pet/properties/name/description",
            old_value=None,
            new_value='"The pet name"',
            change_type="update",
        )

        result = merge_service.merge(full_oas_yaml, [txn])

        assert result.edits_applied == 1
        assert "The pet name" in result.to_yaml()


class TestOASMergeCreate:
    """Tests for create transactions."""

    def test_merge_create_new_field(self, merge_service, minimal_oas_yaml):
        """Create a new field."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/contact",
            old_value=None,
            new_value='{"name":"Support","email":"support@example.com"}',
            change_type="create",
        )

        result = merge_service.merge(minimal_oas_yaml, [txn])

        assert result.edits_applied == 1
        assert "support@example.com" in result.to_yaml()

    def test_merge_create_nested_structure(self, merge_service, minimal_oas_yaml):
        """Create a nested structure."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/externalDocs",
            old_value=None,
            new_value='{"url":"https://docs.example.com","description":"External documentation"}',
            change_type="create",
        )

        result = merge_service.merge(minimal_oas_yaml, [txn])

        assert result.edits_applied == 1
        assert "https://docs.example.com" in result.to_yaml()


class TestOASMergeDelete:
    """Tests for delete transactions."""

    def test_merge_delete_field(self, merge_service, full_oas_yaml):
        """Delete a field."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/description",
            old_value="A pet store API",
            new_value=None,
            change_type="delete",
        )

        result = merge_service.merge(full_oas_yaml, [txn])

        assert result.edits_applied == 1
        # Description should be gone
        assert "A pet store API" not in result.to_yaml()
        # But title should still be there
        assert "Pet Store API" in result.to_yaml()

    def test_merge_delete_nonexistent_field(self, merge_service, minimal_oas_yaml):
        """Delete a field that doesn't exist (should not fail)."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/nonexistent/field",
            old_value=None,
            new_value=None,
            change_type="delete",
        )

        result = merge_service.merge(minimal_oas_yaml, [txn])

        # Should not fail
        assert result.edits_applied == 1


class TestOASMergeMultiple:
    """Tests for multiple transactions."""

    def test_merge_multiple_transactions(self, merge_service, minimal_oas_yaml):
        """Merge multiple transactions in order."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")

        txns = [
            create_transaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="Test API",
                new_value='"Updated API"',
                change_type="update",
            ),
            create_transaction(
                spec_id=spec_id,
                edit_path="/info/x-contact",
                old_value=None,
                new_value='"support@example.com"',
                change_type="create",
            ),
            create_transaction(
                spec_id=spec_id,
                edit_path="/info/version",
                old_value="1.0.0",
                new_value='"2.0.0"',
                change_type="update",
            ),
        ]

        result = merge_service.merge(minimal_oas_yaml, txns)

        assert result.edits_applied == 3
        assert len(result.edits_failed) == 0
        yaml_result = result.to_yaml()
        assert "Updated API" in yaml_result
        assert "support@example.com" in yaml_result
        assert "2.0.0" in yaml_result

    def test_merge_transactions_applied_in_order(self, merge_service, minimal_oas_yaml):
        """Transactions are applied in order."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")

        txns = [
            create_transaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="Test API",
                new_value='"API v1"',
                change_type="update",
            ),
            create_transaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="API v1",
                new_value='"API v2"',
                change_type="update",
            ),
        ]

        result = merge_service.merge(minimal_oas_yaml, txns)

        assert result.edits_applied == 2
        assert "API v2" in result.to_yaml()
        assert "API v1" not in result.to_yaml()


class TestOASMergeFromDict:
    """Tests for merge_from_dict method."""

    def test_merge_from_dict_with_transactions(self, merge_service):
        """Merge from parsed OAS dict."""
        oas_dict = {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
            "paths": {},
        }

        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Test API",
            new_value='"Updated API"',
            change_type="update",
        )

        result = merge_service.merge_from_dict(oas_dict, [txn])

        assert result.edits_applied == 1
        assert result.merged_oas["info"]["title"] == "Updated API"

    def test_merge_from_dict_does_not_modify_original(self, merge_service):
        """merge_from_dict doesn't modify the original dict."""
        oas_dict = {
            "openapi": "3.0.0",
            "info": {"title": "Original Title", "version": "1.0.0"},
            "paths": {},
        }

        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        txn = create_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Original Title",
            new_value='"Changed Title"',
            change_type="update",
        )

        result = merge_service.merge_from_dict(oas_dict, [txn])

        # Original should be unchanged
        assert oas_dict["info"]["title"] == "Original Title"
        # Result should be changed
        assert result.merged_oas["info"]["title"] == "Changed Title"


class TestOASMergeDiff:
    """Tests for computing diffs."""

    def test_compute_diff_simple(self, merge_service):
        """Compute diff between two OAS documents."""
        original = """
openapi: 3.0.0
info:
  title: Original Title
  version: 1.0.0
paths: {}
"""

        merged = """
openapi: 3.0.0
info:
  title: Changed Title
  version: 2.0.0
paths: {}
"""

        diff = merge_service.compute_diff(original, merged)

        assert "changes" in diff
        assert len(diff["changes"]) > 0

    def test_compute_diff_identifies_changes(self, merge_service):
        """Diff identifies changed fields."""
        original = """
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
  description: Old description
paths: {}
"""

        merged = """
openapi: 3.0.0
info:
  title: Test Updated
  version: 1.0.0
paths: {}
"""

        diff = merge_service.compute_diff(original, merged)

        # Should identify that title changed
        title_changes = [c for c in diff["changes"] if "title" in c.get("path", "")]
        assert len(title_changes) > 0

        # Should identify that description was removed
        desc_changes = [c for c in diff["changes"] if "description" in c.get("path", "")]
        assert len(desc_changes) > 0
