"""
T002: Unit tests for OAS Canonical Storage Repository.

Tests for OASRepository persistence operations including:
- Spec storage and retrieval
- Version history tracking
- Transaction logging and retrieval
- Soft and hard delete operations
- Filtering and pagination

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import UUID
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.db.oas_repository import OASRepository
from src.db.migrations.migration_001_create_oas_specs_table import Base, OASSpec, OASEditTransaction


# Test fixtures for in-memory SQLite database
@pytest.fixture
async def engine():
    """Create in-memory SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def session_factory(engine):
    """Create session factory for testing."""
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    return async_session


@pytest.fixture
async def session(session_factory):
    """Create fresh session for each test."""
    async with session_factory() as sess:
        yield sess


@pytest.fixture
async def repository(session):
    """Create OASRepository instance."""
    return OASRepository(session)


# Sample test data
SAMPLE_OAS_YAML = """
openapi: 3.0.0
info:
  title: Pet Store API
  version: 1.0.0
  description: A sample Pet Store API
paths:
  /pets:
    get:
      summary: List all pets
      responses:
        '200':
          description: Success
components:
  schemas:
    Pet:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
"""

SAMPLE_OAS_JSON = """{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store API",
    "version": "1.0.0"
  },
  "paths": {
    "/pets": {
      "get": {
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
"""


class TestOASRepositorySaveAndRetrieve:
    """Tests for saving and retrieving OAS specifications."""

    async def test_save_new_spec(self, repository: OASRepository):
        """Save a new OAS specification."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
            api_title="Pet Store API",
            api_version="1.0.0",
            description="A sample Pet Store API",
        )

        assert spec.spec_id == "pet-store-v1"
        assert spec.oas_content == SAMPLE_OAS_YAML
        assert spec.content_format == "yaml"
        assert spec.api_title == "Pet Store API"
        assert spec.api_version == "1.0.0"
        assert spec.version == 1
        assert spec.is_deleted is False

        await repository.commit()

    async def test_get_spec_by_id(self, repository: OASRepository):
        """Retrieve a specification by spec_id."""
        await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
            api_title="Pet Store API",
            api_version="1.0.0",
        )
        await repository.commit()

        retrieved = await repository.get_spec("pet-store-v1")
        assert retrieved is not None
        assert retrieved.spec_id == "pet-store-v1"
        assert retrieved.oas_content == SAMPLE_OAS_YAML

    async def test_get_spec_returns_none_for_missing_id(self, repository: OASRepository):
        """get_spec returns None for non-existent spec."""
        result = await repository.get_spec("nonexistent")
        assert result is None

    async def test_get_spec_excludes_deleted(self, repository: OASRepository):
        """get_spec excludes soft-deleted specs."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
        )
        await repository.commit()

        # Soft delete the spec
        await repository.delete_spec("pet-store-v1")
        await repository.commit()

        # Should return None after soft delete
        result = await repository.get_spec("pet-store-v1")
        assert result is None

    async def test_get_spec_by_uuid(self, repository: OASRepository):
        """Retrieve a specification by UUID."""
        saved = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
        )
        await repository.commit()

        retrieved = await repository.get_spec_by_uuid(saved.id)
        assert retrieved is not None
        assert retrieved.id == saved.id
        assert retrieved.spec_id == "pet-store-v1"


class TestOASRepositoryVersioning:
    """Tests for OAS specification versioning."""

    async def test_version_incremented_on_update(self, repository: OASRepository):
        """Version number increments on each save."""
        # Save new spec - should be version 1
        spec1 = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
        )
        assert spec1.version == 1
        await repository.commit()

        # Update - should be version 2
        spec2 = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_JSON,
            content_format="json",
        )
        assert spec2.version == 2
        await repository.commit()

        # Retrieve and verify version
        retrieved = await repository.get_spec("pet-store-v1")
        assert retrieved.version == 2

    async def test_content_format_can_change(self, repository: OASRepository):
        """OAS content format can be changed on update (YAML ↔ JSON)."""
        await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            content_format="yaml",
        )
        await repository.commit()

        updated = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_JSON,
            content_format="json",
        )
        assert updated.content_format == "json"
        assert updated.oas_content == SAMPLE_OAS_JSON
        await repository.commit()

    async def test_metadata_can_be_updated(self, repository: OASRepository):
        """Spec metadata (title, version, description) can be updated."""
        await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            api_title="Old Title",
            api_version="1.0.0",
            description="Old description",
        )
        await repository.commit()

        updated = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
            api_title="New Title",
            api_version="2.0.0",
            description="New description",
        )

        assert updated.api_title == "New Title"
        assert updated.api_version == "2.0.0"
        assert updated.description == "New description"
        await repository.commit()


class TestOASRepositoryTransactions:
    """Tests for edit transaction logging."""

    async def test_record_transaction(self, repository: OASRepository):
        """Record an edit transaction."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        transaction = await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
            edited_by="alice@example.com",
            session_id="session-123",
        )

        assert transaction.spec_id == spec.id
        assert transaction.edit_path == "/info/title"
        assert transaction.old_value == "Old Title"
        assert transaction.new_value == "New Title"
        assert transaction.change_type == "update"
        assert transaction.edited_by == "alice@example.com"
        assert transaction.session_id == "session-123"
        await repository.commit()

    async def test_get_transactions_for_spec(self, repository: OASRepository):
        """Retrieve all transactions for a spec."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        # Record multiple transactions
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
            change_type="update",
        )
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/version",
            old_value="1.0.0",
            new_value="2.0.0",
            change_type="update",
        )
        await repository.commit()

        transactions = await repository.get_transactions(spec.id, limit=100)
        assert len(transactions) == 2

        # Should be in reverse chronological order (most recent first)
        assert transactions[0].edit_path == "/info/version"
        assert transactions[1].edit_path == "/info/title"

    async def test_get_transactions_respects_limit(self, repository: OASRepository):
        """get_transactions respects the limit parameter."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        # Record 5 transactions
        for i in range(5):
            await repository.record_transaction(
                spec_id=spec.id,
                edit_path=f"/path{i}",
                old_value="old",
                new_value="new",
                change_type="update",
            )
        await repository.commit()

        # Request only 3
        transactions = await repository.get_transactions(spec.id, limit=3)
        assert len(transactions) == 3

    async def test_get_transactions_for_path(self, repository: OASRepository):
        """Retrieve transactions for a specific path."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        # Record transactions for different paths
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Title 1",
            new_value="Title 2",
            change_type="update",
        )
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/version",
            old_value="1.0.0",
            new_value="2.0.0",
            change_type="update",
        )
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Title 2",
            new_value="Title 3",
            change_type="update",
        )
        await repository.commit()

        # Get transactions for /info/title path only
        title_transactions = await repository.get_transactions_for_path(
            spec.id, "/info/title"
        )

        assert len(title_transactions) == 2
        assert all(t.edit_path == "/info/title" for t in title_transactions)

        # Most recent first
        assert title_transactions[0].new_value == "Title 3"
        assert title_transactions[1].new_value == "Title 2"


class TestOASRepositoryDelete:
    """Tests for soft and hard delete operations."""

    async def test_soft_delete_marks_deleted_flag(self, repository: OASRepository):
        """Soft delete sets is_deleted flag."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        result = await repository.delete_spec("pet-store-v1")
        assert result is True
        await repository.commit()

        # Should not be retrievable via get_spec (which filters is_deleted=False)
        retrieved = await repository.get_spec("pet-store-v1")
        assert retrieved is None

    async def test_soft_delete_returns_false_for_missing_spec(
        self, repository: OASRepository
    ):
        """Soft delete returns False for non-existent spec."""
        result = await repository.delete_spec("nonexistent")
        assert result is False

    async def test_hard_delete_removes_spec_and_transactions(
        self, repository: OASRepository
    ):
        """Hard delete permanently removes spec and its transactions."""
        spec = await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        # Record a transaction
        await repository.record_transaction(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
            change_type="update",
        )
        await repository.commit()

        # Hard delete
        result = await repository.hard_delete_spec("pet-store-v1")
        assert result is True
        await repository.commit()

        # Should not be retrievable at all (not even via get_spec_by_uuid)
        retrieved = await repository.get_spec_by_uuid(spec.id)
        assert retrieved is None

        # Transactions should also be gone
        transactions = await repository.get_transactions(spec.id)
        assert len(transactions) == 0

    async def test_hard_delete_returns_false_for_missing_spec(
        self, repository: OASRepository
    ):
        """Hard delete returns False for non-existent spec."""
        result = await repository.hard_delete_spec("nonexistent")
        assert result is False


class TestOASRepositoryListing:
    """Tests for listing and filtering specifications."""

    async def test_list_specs_empty_database(self, repository: OASRepository):
        """list_specs returns empty list for empty database."""
        specs, total = await repository.list_specs()
        assert specs == []
        assert total == 0

    async def test_list_specs_returns_all_non_deleted(self, repository: OASRepository):
        """list_specs returns all non-deleted specs."""
        for i in range(3):
            await repository.save_spec(
                spec_id=f"api-{i}",
                oas_content=SAMPLE_OAS_YAML,
                api_title=f"API {i}",
            )
        await repository.commit()

        specs, total = await repository.list_specs()
        assert len(specs) == 3
        assert total == 3

    async def test_list_specs_excludes_deleted(self, repository: OASRepository):
        """list_specs excludes soft-deleted specs."""
        for i in range(3):
            await repository.save_spec(
                spec_id=f"api-{i}",
                oas_content=SAMPLE_OAS_YAML,
                api_title=f"API {i}",
            )
        await repository.commit()

        # Soft delete one
        await repository.delete_spec("api-1")
        await repository.commit()

        specs, total = await repository.list_specs()
        assert len(specs) == 2
        assert total == 2
        assert all(s.spec_id != "api-1" for s in specs)

    async def test_list_specs_pagination(self, repository: OASRepository):
        """list_specs respects limit and offset parameters."""
        for i in range(10):
            await repository.save_spec(
                spec_id=f"api-{i}",
                oas_content=SAMPLE_OAS_YAML,
            )
        await repository.commit()

        # First page: 5 items
        page1, total = await repository.list_specs(limit=5, offset=0)
        assert len(page1) == 5
        assert total == 10

        # Second page: 5 items
        page2, total = await repository.list_specs(limit=5, offset=5)
        assert len(page2) == 5
        assert total == 10

        # Pages should have different specs
        page1_ids = {s.spec_id for s in page1}
        page2_ids = {s.spec_id for s in page2}
        assert page1_ids.isdisjoint(page2_ids)

    async def test_list_specs_filter_by_title(self, repository: OASRepository):
        """list_specs filters by api_title (case-insensitive)."""
        await repository.save_spec(
            spec_id="api-1",
            oas_content=SAMPLE_OAS_YAML,
            api_title="Pet Store API",
        )
        await repository.save_spec(
            spec_id="api-2",
            oas_content=SAMPLE_OAS_YAML,
            api_title="User Management API",
        )
        await repository.save_spec(
            spec_id="api-3",
            oas_content=SAMPLE_OAS_YAML,
            api_title="Pet Grooming API",
        )
        await repository.commit()

        # Filter by "Pet" - should match "Pet Store" and "Pet Grooming"
        specs, total = await repository.list_specs(api_title_filter="Pet")
        assert total == 2
        assert all("Pet" in s.api_title for s in specs)

    async def test_list_specs_sorted_by_creation_date(self, repository: OASRepository):
        """list_specs returns results sorted by creation date (newest first)."""
        spec1 = await repository.save_spec(
            spec_id="api-1",
            oas_content=SAMPLE_OAS_YAML,
            api_title="API 1",
        )
        await repository.commit()

        spec2 = await repository.save_spec(
            spec_id="api-2",
            oas_content=SAMPLE_OAS_YAML,
            api_title="API 2",
        )
        await repository.commit()

        specs, _ = await repository.list_specs()

        # spec2 (created later) should come first
        assert specs[0].spec_id == "api-2"
        assert specs[1].spec_id == "api-1"


class TestOASRepositoryCommitAndRollback:
    """Tests for transaction control."""

    async def test_commit_persists_changes(self, repository: OASRepository, session):
        """Commit persists changes to database."""
        await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        await repository.commit()

        # Create new repository with fresh session
        repository2 = OASRepository(session)
        retrieved = await repository2.get_spec("pet-store-v1")
        assert retrieved is not None

    async def test_rollback_discards_changes(self, repository: OASRepository, session):
        """Rollback discards uncommitted changes."""
        await repository.save_spec(
            spec_id="pet-store-v1",
            oas_content=SAMPLE_OAS_YAML,
        )
        # Don't commit, just rollback
        await repository.rollback()

        # Create new repository with fresh session
        repository2 = OASRepository(session)
        retrieved = await repository2.get_spec("pet-store-v1")
        assert retrieved is None


class TestOASRepositoryEdgeCases:
    """Tests for edge cases and error conditions."""

    async def test_save_spec_with_large_oas_content(self, repository: OASRepository):
        """Save OAS spec with large content."""
        # Create a large OAS content by repeating the sample many times
        large_content = SAMPLE_OAS_YAML * 1000

        spec = await repository.save_spec(
            spec_id="large-spec",
            oas_content=large_content,
        )
        await repository.commit()

        retrieved = await repository.get_spec("large-spec")
        assert len(retrieved.oas_content) == len(large_content)
        assert retrieved.oas_content == large_content

    async def test_unicode_content_preserved(self, repository: OASRepository):
        """Unicode characters in OAS content are preserved."""
        unicode_oas = """
openapi: 3.0.0
info:
  title: 宠物商店 API (Pet Store)
  description: Это API для магазина питомцев 🐾
"""
        spec = await repository.save_spec(
            spec_id="unicode-spec",
            oas_content=unicode_oas,
        )
        await repository.commit()

        retrieved = await repository.get_spec("unicode-spec")
        assert retrieved.oas_content == unicode_oas

    async def test_multiple_specs_independent(self, repository: OASRepository):
        """Multiple specs are independent; changes to one don't affect others."""
        spec1 = await repository.save_spec(
            spec_id="api-1",
            oas_content=SAMPLE_OAS_YAML,
            api_title="API 1",
        )
        spec2 = await repository.save_spec(
            spec_id="api-2",
            oas_content=SAMPLE_OAS_JSON,
            api_title="API 2",
        )
        await repository.commit()

        # Update spec1
        await repository.save_spec(
            spec_id="api-1",
            oas_content="updated content",
            api_title="API 1 Updated",
        )
        await repository.commit()

        # spec2 should be unchanged
        retrieved2 = await repository.get_spec("api-2")
        assert retrieved2.api_title == "API 2"
        assert retrieved2.oas_content == SAMPLE_OAS_JSON
