"""
Unit tests for File Repository.

Tests CRUD operations for RequirementFile with async SQLAlchemy.
"""

import pytest
from uuid import UUID
from datetime import datetime, UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repository import FileRepository
from src.models.file import RequirementFile


class TestFileRepository:
    """Test suite for FileRepository CRUD operations."""

    @pytest.fixture
    def repository(self, db_session: AsyncSession) -> FileRepository:
        """Create a FileRepository instance with test session."""
        return FileRepository(db_session)

    # =========================================================================
    # CREATE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_file_minimal(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test creating a file with minimal required fields."""
        file = await repository.create(name="test-api")

        assert file.id is not None
        assert isinstance(file.id, UUID)
        assert file.name == "test-api"
        assert file.content == ""
        assert file.version == 1
        assert file.status == "draft"
        assert file.created_at is not None
        assert file.updated_at is not None

    @pytest.mark.asyncio
    async def test_create_file_with_content(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test creating a file with content."""
        dsl_content = """# Service: Petstore API
version: 1.0.0

## Model: Pet
| name | type | required |
|------|------|----------|
| id | integer | true |
"""
        file = await repository.create(name="petstore", content=dsl_content)

        assert file.name == "petstore"
        assert file.content == dsl_content
        assert "Petstore API" in file.content

    @pytest.mark.asyncio
    async def test_create_file_with_all_fields(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test creating a file with all optional fields."""
        file = await repository.create(
            name="full-api",
            content="# Service: Full",
            status="reviewing",
            created_by="550e8400-e29b-41d4-a716-446655440000"
        )

        assert file.name == "full-api"
        assert file.status == "reviewing"
        assert str(file.created_by) == "550e8400-e29b-41d4-a716-446655440000"

    # =========================================================================
    # GET Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_by_id_found(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test retrieving an existing file by ID."""
        created = await repository.create(name="findme")

        found = await repository.get_by_id(str(created.id))

        assert found is not None
        assert found.id == created.id
        assert found.name == "findme"

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test retrieving a non-existent file returns None."""
        result = await repository.get_by_id("550e8400-e29b-41d4-a716-446655440000")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_invalid_uuid(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test invalid UUID returns None (doesn't raise)."""
        result = await repository.get_by_id("invalid-uuid")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_name_found(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test retrieving a file by name."""
        await repository.create(name="unique-name")

        found = await repository.get_by_name("unique-name")

        assert found is not None
        assert found.name == "unique-name"

    @pytest.mark.asyncio
    async def test_get_by_name_not_found(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test retrieving non-existent file by name."""
        result = await repository.get_by_name("nonexistent")

        assert result is None

    # =========================================================================
    # LIST Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_list_files_empty(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test listing files when none exist."""
        files = await repository.list_files()

        assert files == []

    @pytest.mark.asyncio
    async def test_list_files_multiple(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test listing multiple files."""
        await repository.create(name="api-1")
        await repository.create(name="api-2")
        await repository.create(name="api-3")

        files = await repository.list_files()

        assert len(files) == 3
        names = [f.name for f in files]
        assert "api-1" in names
        assert "api-2" in names
        assert "api-3" in names

    @pytest.mark.asyncio
    async def test_list_files_with_pagination(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test listing files with limit and offset."""
        for i in range(5):
            await repository.create(name=f"api-{i}")

        # Get first page
        page1 = await repository.list_files(limit=2, offset=0)
        assert len(page1) == 2

        # Get second page
        page2 = await repository.list_files(limit=2, offset=2)
        assert len(page2) == 2

        # Get last page
        page3 = await repository.list_files(limit=2, offset=4)
        assert len(page3) == 1

    @pytest.mark.asyncio
    async def test_list_files_filter_by_status(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test listing files filtered by status."""
        await repository.create(name="draft-1", status="draft")
        await repository.create(name="draft-2", status="draft")
        await repository.create(name="reviewing-1", status="reviewing")

        draft_files = await repository.list_files(status="draft")

        assert len(draft_files) == 2
        assert all(f.status == "draft" for f in draft_files)

    @pytest.mark.asyncio
    async def test_list_files_ordered_by_updated_at(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test files are ordered by updated_at descending (most recent first)."""
        file1 = await repository.create(name="old-file")
        file2 = await repository.create(name="new-file")

        # Update file1 to make it more recent
        await repository.update(str(file1.id), content="updated")

        files = await repository.list_files()

        # file1 should be first (most recently updated)
        assert files[0].name == "old-file"
        assert files[1].name == "new-file"

    # =========================================================================
    # UPDATE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_content(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test updating file content."""
        file = await repository.create(name="to-update", content="original")

        updated = await repository.update(str(file.id), content="modified")

        assert updated is not None
        assert updated.content == "modified"
        assert updated.version == 2  # Version should increment

    @pytest.mark.asyncio
    async def test_update_name(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test updating file name."""
        file = await repository.create(name="original-name")

        updated = await repository.update(str(file.id), name="new-name")

        assert updated.name == "new-name"

    @pytest.mark.asyncio
    async def test_update_status(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test updating file status."""
        file = await repository.create(name="status-test")
        assert file.status == "draft"

        updated = await repository.update(str(file.id), status="approved")

        assert updated.status == "approved"

    @pytest.mark.asyncio
    async def test_update_increments_version(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test that each update increments version."""
        file = await repository.create(name="versioned")
        assert file.version == 1

        file = await repository.update(str(file.id), content="v2")
        assert file.version == 2

        file = await repository.update(str(file.id), content="v3")
        assert file.version == 3

    @pytest.mark.asyncio
    async def test_update_updates_timestamp(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test that update modifies updated_at timestamp."""
        file = await repository.create(name="timestamp-test")
        original_updated = file.updated_at

        # Small delay to ensure timestamp difference
        import asyncio
        await asyncio.sleep(0.01)

        updated = await repository.update(str(file.id), content="new")

        assert updated.updated_at > original_updated

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_none(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test updating non-existent file returns None."""
        result = await repository.update(
            "550e8400-e29b-41d4-a716-446655440000",
            content="test"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_update_multiple_fields(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test updating multiple fields at once."""
        file = await repository.create(name="multi-update")

        updated = await repository.update(
            str(file.id),
            name="renamed",
            content="new content",
            status="reviewing"
        )

        assert updated.name == "renamed"
        assert updated.content == "new content"
        assert updated.status == "reviewing"

    # =========================================================================
    # DELETE Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_file(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test deleting a file."""
        file = await repository.create(name="to-delete")
        file_id = str(file.id)

        result = await repository.delete(file_id)

        assert result is True

        # Verify file is gone
        found = await repository.get_by_id(file_id)
        assert found is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_false(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test deleting non-existent file returns False."""
        result = await repository.delete("550e8400-e29b-41d4-a716-446655440000")

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_cascades_to_related_entities(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test that deleting a file cascades to related entities."""
        from src.models.file import Service, Model, EntityField

        # Create file with related entities
        file = await repository.create(name="cascade-test")

        service = Service(file_id=file.id, name="TestService")
        model = Model(file_id=file.id, name="TestModel")
        db_session.add(service)
        db_session.add(model)
        await db_session.commit()

        field = EntityField(model_id=model.id, name="id", type="integer")
        db_session.add(field)
        await db_session.commit()

        # Delete the file
        result = await repository.delete(str(file.id))
        assert result is True

        # Verify related entities are also deleted
        services = (await db_session.execute(
            select(Service).where(Service.file_id == file.id)
        )).scalars().all()
        assert len(services) == 0

        models = (await db_session.execute(
            select(Model).where(Model.file_id == file.id)
        )).scalars().all()
        assert len(models) == 0

    # =========================================================================
    # COUNT Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_count_files_empty(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test counting when no files exist."""
        count = await repository.count()

        assert count == 0

    @pytest.mark.asyncio
    async def test_count_files_multiple(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test counting multiple files."""
        for i in range(5):
            await repository.create(name=f"file-{i}")

        count = await repository.count()

        assert count == 5

    @pytest.mark.asyncio
    async def test_count_files_with_status_filter(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test counting files with status filter."""
        await repository.create(name="draft-1", status="draft")
        await repository.create(name="draft-2", status="draft")
        await repository.create(name="approved-1", status="approved")

        draft_count = await repository.count(status="draft")
        approved_count = await repository.count(status="approved")
        total_count = await repository.count()

        assert draft_count == 2
        assert approved_count == 1
        assert total_count == 3

    # =========================================================================
    # EXISTS Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_exists_by_id_true(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test exists returns True for existing file."""
        file = await repository.create(name="exists-test")

        exists = await repository.exists(str(file.id))

        assert exists is True

    @pytest.mark.asyncio
    async def test_exists_by_id_false(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test exists returns False for non-existent file."""
        exists = await repository.exists("550e8400-e29b-41d4-a716-446655440000")

        assert exists is False

    @pytest.mark.asyncio
    async def test_exists_by_name_true(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test name_exists returns True for existing name."""
        await repository.create(name="unique-name")

        exists = await repository.name_exists("unique-name")

        assert exists is True

    @pytest.mark.asyncio
    async def test_exists_by_name_false(
        self, repository: FileRepository, db_session: AsyncSession
    ):
        """Test name_exists returns False for non-existent name."""
        exists = await repository.name_exists("nonexistent-name")

        assert exists is False
