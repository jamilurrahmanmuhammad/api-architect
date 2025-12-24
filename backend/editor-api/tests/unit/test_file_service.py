"""
Unit tests for FileService.

Tests business logic layer for file operations with mocked repository.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, UTC

from src.services.file_service import (
    FileService,
    FileNotFoundError,
    FileNameExistsError,
    FileValidationError,
)
from src.models.file import RequirementFile


class TestFileService:
    """Test suite for FileService business logic."""

    @pytest.fixture
    def mock_repository(self):
        """Create a mock FileRepository."""
        repository = AsyncMock()
        return repository

    @pytest.fixture
    def file_service(self, mock_repository):
        """Create a FileService with mocked repository."""
        return FileService(mock_repository)

    def _make_file(
        self,
        name: str = "test-api",
        content: str = "",
        version: int = 1,
        status: str = "draft",
    ) -> RequirementFile:
        """Helper to create a mock RequirementFile."""
        file = MagicMock(spec=RequirementFile)
        file.id = uuid4()
        file.name = name
        file.content = content
        file.version = version
        file.status = status
        file.created_at = datetime.now(UTC)
        file.updated_at = datetime.now(UTC)
        file.created_by = None
        file.parsed_at = None
        return file

    # =========================================================================
    # CREATE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_file_success(self, file_service, mock_repository):
        """Test creating a file successfully."""
        mock_file = self._make_file(name="new-api")
        mock_repository.name_exists.return_value = False
        mock_repository.create.return_value = mock_file

        result = await file_service.create_file(name="new-api", content="# Service: Test")

        mock_repository.name_exists.assert_called_once_with("new-api")
        mock_repository.create.assert_called_once_with(
            name="new-api",
            content="# Service: Test",
            status="draft",
            created_by=None,
        )
        assert result == mock_file

    @pytest.mark.asyncio
    async def test_create_file_name_exists_error(self, file_service, mock_repository):
        """Test creating a file with existing name raises error."""
        mock_repository.name_exists.return_value = True

        with pytest.raises(FileNameExistsError) as exc:
            await file_service.create_file(name="existing-api")

        assert "existing-api" in str(exc.value)
        mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_file_validates_name_not_empty(self, file_service, mock_repository):
        """Test creating a file with empty name raises validation error."""
        with pytest.raises(FileValidationError) as exc:
            await file_service.create_file(name="")

        assert "name" in str(exc.value).lower()
        mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_file_validates_name_not_whitespace(self, file_service, mock_repository):
        """Test creating a file with whitespace name raises validation error."""
        with pytest.raises(FileValidationError) as exc:
            await file_service.create_file(name="   ")

        assert "name" in str(exc.value).lower()
        mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_file_with_custom_status(self, file_service, mock_repository):
        """Test creating a file with custom status."""
        mock_file = self._make_file(status="reviewing")
        mock_repository.name_exists.return_value = False
        mock_repository.create.return_value = mock_file

        result = await file_service.create_file(
            name="api", content="", status="reviewing"
        )

        mock_repository.create.assert_called_once_with(
            name="api",
            content="",
            status="reviewing",
            created_by=None,
        )

    @pytest.mark.asyncio
    async def test_create_file_validates_status(self, file_service, mock_repository):
        """Test creating a file with invalid status raises error."""
        with pytest.raises(FileValidationError) as exc:
            await file_service.create_file(name="api", status="invalid-status")

        assert "status" in str(exc.value).lower()
        mock_repository.create.assert_not_called()

    # =========================================================================
    # GET Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_file_success(self, file_service, mock_repository):
        """Test getting a file by ID successfully."""
        mock_file = self._make_file()
        mock_repository.get_by_id.return_value = mock_file

        result = await file_service.get_file(str(mock_file.id))

        mock_repository.get_by_id.assert_called_once_with(str(mock_file.id))
        assert result == mock_file

    @pytest.mark.asyncio
    async def test_get_file_not_found(self, file_service, mock_repository):
        """Test getting a non-existent file raises error."""
        mock_repository.get_by_id.return_value = None

        with pytest.raises(FileNotFoundError) as exc:
            await file_service.get_file("550e8400-e29b-41d4-a716-446655440000")

        assert "not found" in str(exc.value).lower()

    @pytest.mark.asyncio
    async def test_get_file_by_name_success(self, file_service, mock_repository):
        """Test getting a file by name successfully."""
        mock_file = self._make_file(name="target-api")
        mock_repository.get_by_name.return_value = mock_file

        result = await file_service.get_file_by_name("target-api")

        mock_repository.get_by_name.assert_called_once_with("target-api")
        assert result == mock_file

    @pytest.mark.asyncio
    async def test_get_file_by_name_not_found(self, file_service, mock_repository):
        """Test getting a non-existent file by name raises error."""
        mock_repository.get_by_name.return_value = None

        with pytest.raises(FileNotFoundError) as exc:
            await file_service.get_file_by_name("nonexistent")

        assert "not found" in str(exc.value).lower()

    # =========================================================================
    # LIST Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_list_files_success(self, file_service, mock_repository):
        """Test listing files successfully."""
        mock_files = [self._make_file(name=f"api-{i}") for i in range(3)]
        mock_repository.list_files.return_value = mock_files
        mock_repository.count.return_value = 3

        result = await file_service.list_files()

        mock_repository.list_files.assert_called_once()
        assert result["files"] == mock_files
        assert result["total"] == 3

    @pytest.mark.asyncio
    async def test_list_files_with_pagination(self, file_service, mock_repository):
        """Test listing files with pagination."""
        mock_files = [self._make_file(name=f"api-{i}") for i in range(2)]
        mock_repository.list_files.return_value = mock_files
        mock_repository.count.return_value = 10

        result = await file_service.list_files(limit=2, offset=4)

        mock_repository.list_files.assert_called_once_with(
            limit=2, offset=4, status=None
        )
        assert result["files"] == mock_files
        assert result["total"] == 10
        assert result["limit"] == 2
        assert result["offset"] == 4

    @pytest.mark.asyncio
    async def test_list_files_with_status_filter(self, file_service, mock_repository):
        """Test listing files filtered by status."""
        mock_files = [self._make_file(status="approved")]
        mock_repository.list_files.return_value = mock_files
        mock_repository.count.return_value = 1

        result = await file_service.list_files(status="approved")

        mock_repository.list_files.assert_called_once_with(
            limit=100, offset=0, status="approved"
        )
        mock_repository.count.assert_called_once_with(status="approved")

    @pytest.mark.asyncio
    async def test_list_files_empty(self, file_service, mock_repository):
        """Test listing when no files exist."""
        mock_repository.list_files.return_value = []
        mock_repository.count.return_value = 0

        result = await file_service.list_files()

        assert result["files"] == []
        assert result["total"] == 0

    # =========================================================================
    # UPDATE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_file_content_success(self, file_service, mock_repository):
        """Test updating file content successfully."""
        original_file = self._make_file(content="original")
        updated_file = self._make_file(content="updated", version=2)
        mock_repository.get_by_id.return_value = original_file
        mock_repository.update.return_value = updated_file

        result = await file_service.update_file(
            str(original_file.id), content="updated"
        )

        mock_repository.update.assert_called_once()
        assert result == updated_file

    @pytest.mark.asyncio
    async def test_update_file_not_found(self, file_service, mock_repository):
        """Test updating non-existent file raises error."""
        mock_repository.get_by_id.return_value = None

        with pytest.raises(FileNotFoundError):
            await file_service.update_file(
                "550e8400-e29b-41d4-a716-446655440000",
                content="test"
            )

    @pytest.mark.asyncio
    async def test_update_file_name_success(self, file_service, mock_repository):
        """Test updating file name successfully."""
        original = self._make_file(name="old-name")
        updated = self._make_file(name="new-name")
        mock_repository.get_by_id.return_value = original
        mock_repository.name_exists.return_value = False
        mock_repository.update.return_value = updated

        result = await file_service.update_file(str(original.id), name="new-name")

        mock_repository.name_exists.assert_called_once_with("new-name")
        mock_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_file_name_already_exists(self, file_service, mock_repository):
        """Test updating to existing name raises error."""
        original = self._make_file(name="old-name")
        mock_repository.get_by_id.return_value = original
        mock_repository.name_exists.return_value = True

        with pytest.raises(FileNameExistsError):
            await file_service.update_file(str(original.id), name="existing-name")

        mock_repository.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_file_same_name_allowed(self, file_service, mock_repository):
        """Test updating other fields with same name is allowed."""
        original = self._make_file(name="same-name", content="old")
        updated = self._make_file(name="same-name", content="new")
        mock_repository.get_by_id.return_value = original
        mock_repository.update.return_value = updated

        # Update content only, name unchanged
        result = await file_service.update_file(
            str(original.id), content="new"
        )

        # Should not check name_exists since name wasn't changed
        mock_repository.name_exists.assert_not_called()
        mock_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_file_validates_status(self, file_service, mock_repository):
        """Test updating with invalid status raises error."""
        original = self._make_file()
        mock_repository.get_by_id.return_value = original

        with pytest.raises(FileValidationError) as exc:
            await file_service.update_file(str(original.id), status="invalid")

        assert "status" in str(exc.value).lower()
        mock_repository.update.assert_not_called()

    # =========================================================================
    # DELETE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_file_success(self, file_service, mock_repository):
        """Test deleting a file successfully."""
        mock_repository.delete.return_value = True

        result = await file_service.delete_file(
            "550e8400-e29b-41d4-a716-446655440000"
        )

        mock_repository.delete.assert_called_once_with(
            "550e8400-e29b-41d4-a716-446655440000"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_file_not_found(self, file_service, mock_repository):
        """Test deleting non-existent file raises error."""
        mock_repository.delete.return_value = False

        with pytest.raises(FileNotFoundError):
            await file_service.delete_file(
                "550e8400-e29b-41d4-a716-446655440000"
            )

    # =========================================================================
    # EXISTS Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_file_exists_true(self, file_service, mock_repository):
        """Test file_exists returns True for existing file."""
        mock_repository.exists.return_value = True

        result = await file_service.file_exists(
            "550e8400-e29b-41d4-a716-446655440000"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_file_exists_false(self, file_service, mock_repository):
        """Test file_exists returns False for non-existent file."""
        mock_repository.exists.return_value = False

        result = await file_service.file_exists(
            "550e8400-e29b-41d4-a716-446655440000"
        )

        assert result is False

    # =========================================================================
    # Validation Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_valid_statuses(self, file_service, mock_repository):
        """Test all valid statuses are accepted."""
        valid_statuses = ["draft", "reviewing", "approved", "published"]

        for status in valid_statuses:
            mock_repository.name_exists.return_value = False
            mock_repository.create.return_value = self._make_file(status=status)

            # Should not raise
            await file_service.create_file(name=f"api-{status}", status=status)

    @pytest.mark.asyncio
    async def test_name_trimmed(self, file_service, mock_repository):
        """Test name is trimmed of whitespace."""
        mock_file = self._make_file(name="trimmed-name")
        mock_repository.name_exists.return_value = False
        mock_repository.create.return_value = mock_file

        await file_service.create_file(name="  trimmed-name  ")

        mock_repository.create.assert_called_once_with(
            name="trimmed-name",
            content="",
            status="draft",
            created_by=None,
        )
