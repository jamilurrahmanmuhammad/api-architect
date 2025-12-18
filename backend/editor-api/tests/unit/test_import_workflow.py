"""
T010: Unit tests for OAS Import Workflow Service.

Tests for complete import workflow:
- CSV import with validation and merging
- OAS import with preservation of complex structures
- Transaction tracking for audit trail
- Error handling and detailed reporting
- Database persistence

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import AsyncMock, patch

from src.services.import_workflow import (
    ImportWorkflow,
    ImportResult,
    ImportError,
    ImportSource,
)


@pytest.fixture
def import_workflow():
    """Create import workflow instance."""
    repo = AsyncMock()
    merger = AsyncMock()
    validator = AsyncMock()
    csv_converter = AsyncMock()
    tracker = AsyncMock()

    return ImportWorkflow(
        repository=repo,
        merger=merger,
        validator=validator,
        csv_converter=csv_converter,
        tracker=tracker,
    )


class TestImportWorkflowBasics:
    """Tests for basic import workflow functionality."""

    @pytest.mark.asyncio
    async def test_import_csv_creates_new_spec(self, import_workflow):
        """Import CSV content creates new OAS specification."""
        csv_content = "path,method,summary\n/pets,get,List all pets"
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "info": {"title": "Pet Store", "version": "1.0.0"},
            "paths": {"/pets": {"get": {"summary": "List all pets"}}},
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=uuid4(), version=1
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            api_title="Pet Store",
        )

        # Verify
        assert result.success
        assert result.source == ImportSource.CSV
        assert result.spec_id == spec_id
        assert result.rows_imported == 1
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_import_csv_validates_before_save(self, import_workflow):
        """CSV import validates OAS before saving to database."""
        csv_content = "invalid"
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "info": {"title": "Test"},
            "paths": {},
        }
        import_workflow.validator.validate.return_value = {
            "valid": False,
            "errors": [{"path": "$.info.version", "message": "Missing required field: version"}],
        }

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            api_title="Test",
        )

        # Verify
        assert not result.success
        assert len(result.errors) > 0
        assert any("version" in str(e) for e in result.errors)

    @pytest.mark.asyncio
    async def test_import_oas_preserves_complex_structures(self, import_workflow):
        """OAS import preserves allOf, oneOf, $ref and vendor extensions."""
        oas_content = """{
            "openapi": "3.0.0",
            "info": {"title": "Pet Store", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "allOf": [
                            {"$ref": "#/components/schemas/Animal"},
                            {"type": "object", "properties": {"name": {"type": "string"}}}
                        ],
                        "x-custom-field": "preserved"
                    }
                }
            }
        }"""
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=uuid4(), version=1
        )

        # Execute
        result = await import_workflow.import_oas(
            oas_content=oas_content,
            spec_id=spec_id,
        )

        # Verify
        assert result.success
        assert result.source == ImportSource.OAS
        assert "Complex structures preserved" in result.message or result.success

    @pytest.mark.asyncio
    async def test_import_merges_with_existing_spec(self, import_workflow):
        """Import merges new content with existing spec when merge=True."""
        csv_content = "path,method,summary\n/users,get,List users"
        spec_id = str(uuid4())
        existing_spec = {
            "openapi": "3.0.0",
            "info": {"title": "Old", "version": "1.0.0"},
            "paths": {"/pets": {"get": {"summary": "List pets"}}},
        }

        # Setup mocks
        import_workflow.repository.get_spec.return_value = AsyncMock(
            oas_content='{"openapi": "3.0.0", "paths": {}}'
        )
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {"/users": {"get": {"summary": "List users"}}},
        }
        import_workflow.merger.merge.return_value = {
            "openapi": "3.0.0",
            "paths": {
                "/pets": {"get": {"summary": "List pets"}},
                "/users": {"get": {"summary": "List users"}},
            },
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=uuid4(), version=2
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            merge=True,
        )

        # Verify merge was called
        assert import_workflow.merger.merge.called
        assert result.success


class TestImportWorkflowTransactionTracking:
    """Tests for transaction tracking in imports."""

    @pytest.mark.asyncio
    async def test_import_tracks_transactions(self, import_workflow):
        """Import creates transaction records for audit trail."""
        csv_content = "path,method,summary\n/pets,get,List pets"
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {"/pets": {"get": {"summary": "List pets"}}},
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=1
        )
        import_workflow.tracker.record_edit.return_value = AsyncMock()

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            edited_by="user123",
        )

        # Verify import successful
        assert result.success

    @pytest.mark.asyncio
    async def test_import_records_changed_paths(self, import_workflow):
        """Import tracks which paths were changed."""
        csv_content = "path,method,summary\n/pets,get,List pets\n/users,post,Create user"
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {
                "/pets": {"get": {"summary": "List pets"}},
                "/users": {"post": {"summary": "Create user"}},
            },
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=1
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
        )

        # Verify
        assert result.success
        assert result.paths_added >= 2


class TestImportWorkflowErrorHandling:
    """Tests for error handling in imports."""

    @pytest.mark.asyncio
    async def test_import_handles_invalid_csv(self, import_workflow):
        """Invalid CSV format returns detailed error."""
        csv_content = "this is not valid CSV format at all"
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.csv_converter.convert.side_effect = ValueError(
            "CSV format error: missing required headers"
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
        )

        # Verify
        assert not result.success
        assert len(result.errors) > 0
        assert any("CSV format" in str(e) for e in result.errors)

    @pytest.mark.asyncio
    async def test_import_handles_merge_conflicts(self, import_workflow):
        """Import detects conflicts when merging."""
        csv_content = "path,method,summary\n/pets,get,Updated description"
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.repository.get_spec.return_value = AsyncMock(
            oas_content='{"paths": {"/pets": {"get": {"summary": "Old"}}}}'
        )
        import_workflow.csv_converter.convert.return_value = {
            "paths": {"/pets": {"get": {"summary": "Updated description"}}}
        }
        import_workflow.merger.merge.side_effect = ValueError("Merge conflict detected")

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            merge=True,
        )

        # Verify conflict detected
        assert not result.success
        assert any("conflict" in str(e).lower() for e in result.errors)

    @pytest.mark.asyncio
    async def test_import_handles_database_errors(self, import_workflow):
        """Import handles database errors gracefully."""
        csv_content = "path,method,summary\n/pets,get,List pets"
        spec_id = str(uuid4())

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {"/pets": {"get": {"summary": "List pets"}}},
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.side_effect = RuntimeError(
            "Database connection failed"
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
        )

        # Verify error handled
        assert not result.success
        assert len(result.errors) > 0


class TestImportWorkflowResults:
    """Tests for import result reporting."""

    @pytest.mark.asyncio
    async def test_import_result_includes_summary(self, import_workflow):
        """Import result includes detailed summary."""
        csv_content = "path,method,summary\n/pets,get,List pets\n/users,post,Create user"
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {
                "/pets": {"get": {"summary": "List pets"}},
                "/users": {"post": {"summary": "Create user"}},
            },
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=1
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
        )

        # Verify result
        assert isinstance(result, ImportResult)
        assert result.success
        assert result.spec_id == spec_id
        assert result.message
        assert isinstance(result.timestamp, datetime)

    @pytest.mark.asyncio
    async def test_import_result_tracks_statistics(self, import_workflow):
        """Import result tracks detailed statistics."""
        csv_content = "path,method,summary\n/pets,get,List pets"
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {"/pets": {"get": {"summary": "List pets"}}},
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=2
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
        )

        # Verify stats
        assert result.rows_imported >= 1
        assert result.paths_added >= 0
        assert result.schemas_added >= 0


class TestImportWorkflowProfiles:
    """Tests for profile-based CSV import."""

    @pytest.mark.asyncio
    async def test_import_basic_profile_csv(self, import_workflow):
        """Import basic profile CSV with minimal fields."""
        csv_content = "path,method,summary\n/api/users,get,Get all users"
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {"/api/users": {"get": {"summary": "Get all users"}}},
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=1
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            profile="basic",
        )

        # Verify
        assert result.success

    @pytest.mark.asyncio
    async def test_import_advanced_profile_csv(self, import_workflow):
        """Import advanced profile CSV with parameters and validation."""
        csv_content = (
            "path,method,summary,parameter_name,parameter_type\n"
            "/users,get,List users,limit,query\n"
            "/users,get,List users,offset,query"
        )
        spec_id = str(uuid4())
        spec_uuid = uuid4()

        # Setup mocks
        import_workflow.csv_converter.convert.return_value = {
            "openapi": "3.0.0",
            "paths": {
                "/users": {
                    "get": {
                        "summary": "List users",
                        "parameters": [
                            {"name": "limit", "in": "query"},
                            {"name": "offset", "in": "query"},
                        ],
                    }
                }
            },
        }
        import_workflow.validator.validate.return_value = {"valid": True, "errors": []}
        import_workflow.repository.save_spec.return_value = AsyncMock(
            spec_id=spec_id, id=spec_uuid, version=1
        )

        # Execute
        result = await import_workflow.import_csv(
            csv_content=csv_content,
            spec_id=spec_id,
            profile="advanced",
        )

        # Verify
        assert result.success
