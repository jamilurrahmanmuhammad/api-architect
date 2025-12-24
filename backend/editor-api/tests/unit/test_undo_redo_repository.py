"""
T015: Database persistence tests for Undo/Redo Repository.

Tests for async database operations with UndoRedoRepository:
- Transaction saving and retrieval
- Undo stack queries
- History pagination
- Sequence number management
- Stack size limits
- Per-specification isolation

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.db.migrations.migration_001_create_oas_specs_table import Base, UndoRedoTransaction
from src.db.undo_redo_repository import UndoRedoRepository


@pytest_asyncio.fixture
async def async_engine():
    """Create an async SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine):
    """Create an async session for testing."""
    async_session_maker = sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def repository(async_session):
    """Create a repository with test session."""
    return UndoRedoRepository(async_session)


@pytest_asyncio.fixture
def spec_id():
    """Create a spec ID for testing."""
    return uuid4()


class TestTransactionSaving:
    """Tests for saving transactions to database."""

    async def test_save_single_transaction(self, repository, spec_id, async_session):
        """Saving a transaction creates a database record."""
        transaction = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
            edited_by="user1",
            session_id="sess-123",
        )

        assert transaction.id is not None
        assert transaction.spec_id == spec_id
        assert transaction.edit_path == "/info/title"
        assert transaction.old_value == "Old Title"
        assert transaction.new_value == "New Title"
        assert transaction.change_type == "update"
        assert transaction.sequence_number == 1
        assert transaction.edited_by == "user1"
        assert transaction.session_id == "sess-123"

    async def test_save_multiple_transactions_increments_sequence(self, repository, spec_id):
        """Multiple transactions get incrementing sequence numbers."""
        txn1 = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
            change_type="update",
        )

        txn2 = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field2",
            old_value="c",
            new_value="d",
            change_type="update",
        )

        txn3 = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field3",
            old_value="e",
            new_value="f",
            change_type="update",
        )

        assert txn1.sequence_number == 1
        assert txn2.sequence_number == 2
        assert txn3.sequence_number == 3

    async def test_different_specs_have_independent_sequences(self, repository):
        """Different specs maintain independent sequence numbers."""
        spec1 = uuid4()
        spec2 = uuid4()

        txn1_spec1 = await repository.save_transaction(
            spec_id=spec1,
            edit_path="/field1",
            old_value="a",
            new_value="b",
        )

        txn1_spec2 = await repository.save_transaction(
            spec_id=spec2,
            edit_path="/field1",
            old_value="c",
            new_value="d",
        )

        txn2_spec1 = await repository.save_transaction(
            spec_id=spec1,
            edit_path="/field2",
            old_value="e",
            new_value="f",
        )

        assert txn1_spec1.sequence_number == 1
        assert txn1_spec2.sequence_number == 1  # Independent sequence
        assert txn2_spec1.sequence_number == 2

    async def test_save_with_none_values(self, repository, spec_id):
        """Saving transactions with None values works correctly."""
        transaction = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/paths/~1new",
            old_value=None,
            new_value='{"get": {}}',
            change_type="create",
        )

        assert transaction.old_value is None
        assert transaction.new_value == '{"get": {}}'
        assert transaction.change_type == "create"


class TestUndoStackRetrieval:
    """Tests for getting undo stack."""

    async def test_get_undo_stack_empty(self, repository, spec_id):
        """Getting undo stack for new spec returns empty list."""
        stack = await repository.get_undo_stack(spec_id)
        assert stack == []

    async def test_get_undo_stack_single_transaction(self, repository, spec_id):
        """Getting undo stack with one transaction returns it."""
        await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
        )

        stack = await repository.get_undo_stack(spec_id)
        assert len(stack) == 1
        assert stack[0].edit_path == "/field1"
        assert stack[0].sequence_number == 1

    async def test_get_undo_stack_multiple_transactions_ordered(self, repository, spec_id):
        """Undo stack returns transactions in correct order (oldest first)."""
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        stack = await repository.get_undo_stack(spec_id)
        assert len(stack) == 5

        # Check ordering: oldest first
        for i, txn in enumerate(stack):
            assert txn.sequence_number == i + 1
            assert txn.edit_path == f"/field{i}"

    async def test_get_undo_stack_respects_max_size(self, repository, spec_id):
        """Undo stack respects max_size parameter."""
        for i in range(10):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        # Get only last 5
        stack = await repository.get_undo_stack(spec_id, max_size=5)
        assert len(stack) == 5

        # Should be the most recent ones: seq 6-10
        assert stack[0].sequence_number == 6
        assert stack[4].sequence_number == 10

    async def test_undo_stack_isolated_by_spec(self, repository):
        """Undo stacks are isolated by specification."""
        spec1 = uuid4()
        spec2 = uuid4()

        for i in range(3):
            await repository.save_transaction(
                spec_id=spec1,
                edit_path=f"/spec1/field{i}",
                old_value="a",
                new_value="b",
            )

        for i in range(2):
            await repository.save_transaction(
                spec_id=spec2,
                edit_path=f"/spec2/field{i}",
                old_value="c",
                new_value="d",
            )

        stack1 = await repository.get_undo_stack(spec1)
        stack2 = await repository.get_undo_stack(spec2)

        assert len(stack1) == 3
        assert len(stack2) == 2
        assert all(t.edit_path.startswith("/spec1") for t in stack1)
        assert all(t.edit_path.startswith("/spec2") for t in stack2)


class TestHistoryRetrieval:
    """Tests for paginated history retrieval."""

    async def test_get_history_empty(self, repository, spec_id):
        """Getting history for new spec returns empty."""
        transactions, total = await repository.get_history(spec_id)
        assert transactions == []
        assert total == 0

    async def test_get_history_single_transaction(self, repository, spec_id):
        """Getting history with one transaction returns it."""
        await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
        )

        transactions, total = await repository.get_history(spec_id)
        assert len(transactions) == 1
        assert total == 1
        assert transactions[0].edit_path == "/field1"

    async def test_get_history_pagination(self, repository, spec_id):
        """History pagination works correctly."""
        for i in range(25):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        # Get first page
        page1, total1 = await repository.get_history(spec_id, limit=10, offset=0)
        assert len(page1) == 10
        assert total1 == 25
        assert page1[0].sequence_number == 1
        assert page1[9].sequence_number == 10

        # Get second page
        page2, total2 = await repository.get_history(spec_id, limit=10, offset=10)
        assert len(page2) == 10
        assert total2 == 25
        assert page2[0].sequence_number == 11
        assert page2[9].sequence_number == 20

        # Get third page (partial)
        page3, total3 = await repository.get_history(spec_id, limit=10, offset=20)
        assert len(page3) == 5
        assert total3 == 25
        assert page3[0].sequence_number == 21
        assert page3[4].sequence_number == 25

    async def test_get_history_ordered_by_sequence(self, repository, spec_id):
        """History is ordered by sequence number."""
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        transactions, total = await repository.get_history(spec_id)
        assert total == 5

        for i, txn in enumerate(transactions):
            assert txn.sequence_number == i + 1


class TestSequenceNumberManagement:
    """Tests for sequence number operations."""

    async def test_get_max_sequence_empty(self, repository, spec_id):
        """Max sequence for new spec is 0."""
        max_seq = await repository.get_max_sequence(spec_id)
        assert max_seq == 0

    async def test_get_max_sequence_with_transactions(self, repository, spec_id):
        """Max sequence returns highest sequence number."""
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        max_seq = await repository.get_max_sequence(spec_id)
        assert max_seq == 5

    async def test_get_next_sequence_number(self, repository, spec_id):
        """Next sequence number is max + 1."""
        # Empty spec should give 1
        next_seq = await repository._get_next_sequence_number(spec_id)
        assert next_seq == 1

        # After 5 transactions should give 6
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        next_seq = await repository._get_next_sequence_number(spec_id)
        assert next_seq == 6


class TestHistoryClearance:
    """Tests for clearing history."""

    async def test_clear_history_empty(self, repository, spec_id):
        """Clearing empty history returns 0."""
        count = await repository.clear_history(spec_id)
        assert count == 0

    async def test_clear_history_deletes_transactions(self, repository, spec_id):
        """Clearing history deletes all transactions for spec."""
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        count = await repository.clear_history(spec_id)
        assert count == 5

        # Verify cleared
        transactions, total = await repository.get_history(spec_id)
        assert len(transactions) == 0
        assert total == 0

    async def test_clear_history_isolated_by_spec(self, repository):
        """Clearing one spec's history doesn't affect others."""
        spec1 = uuid4()
        spec2 = uuid4()

        for i in range(3):
            await repository.save_transaction(
                spec_id=spec1,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        for i in range(2):
            await repository.save_transaction(
                spec_id=spec2,
                edit_path=f"/field{i}",
                old_value="c",
                new_value="d",
            )

        # Clear spec1
        count = await repository.clear_history(spec1)
        assert count == 3

        # Verify spec1 is cleared
        txns1, total1 = await repository.get_history(spec1)
        assert total1 == 0

        # Verify spec2 is intact
        txns2, total2 = await repository.get_history(spec2)
        assert total2 == 2


class TestTransactionCounting:
    """Tests for transaction counting."""

    async def test_get_transaction_count_empty(self, repository, spec_id):
        """Transaction count for new spec is 0."""
        count = await repository.get_transaction_count(spec_id)
        assert count == 0

    async def test_get_transaction_count_with_transactions(self, repository, spec_id):
        """Transaction count returns correct number."""
        for i in range(7):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        count = await repository.get_transaction_count(spec_id)
        assert count == 7

    async def test_transaction_count_isolated_by_spec(self, repository):
        """Transaction counts are isolated by spec."""
        spec1 = uuid4()
        spec2 = uuid4()

        for i in range(5):
            await repository.save_transaction(spec_id=spec1, edit_path=f"/f{i}", old_value="a", new_value="b")

        for i in range(3):
            await repository.save_transaction(spec_id=spec2, edit_path=f"/f{i}", old_value="c", new_value="d")

        assert await repository.get_transaction_count(spec1) == 5
        assert await repository.get_transaction_count(spec2) == 3


class TestRecentTransactions:
    """Tests for retrieving recent transactions."""

    async def test_get_recent_transactions_empty(self, repository, spec_id):
        """Recent transactions for new spec returns empty."""
        recent = await repository.get_recent_transactions(spec_id)
        assert recent == []

    async def test_get_recent_transactions_returns_newest_first(self, repository, spec_id):
        """Recent transactions returns newest first (desc order)."""
        for i in range(5):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        recent = await repository.get_recent_transactions(spec_id)
        assert len(recent) == 5

        # Should be newest first
        assert recent[0].sequence_number == 5
        assert recent[1].sequence_number == 4
        assert recent[4].sequence_number == 1

    async def test_get_recent_transactions_respects_count(self, repository, spec_id):
        """Recent transactions respects count parameter."""
        for i in range(10):
            await repository.save_transaction(
                spec_id=spec_id,
                edit_path=f"/field{i}",
                old_value="a",
                new_value="b",
            )

        recent = await repository.get_recent_transactions(spec_id, count=5)
        assert len(recent) == 5

        # Should be 10, 9, 8, 7, 6
        assert recent[0].sequence_number == 10
        assert recent[4].sequence_number == 6


class TestTransactionTypes:
    """Tests for different transaction types."""

    async def test_save_update_transaction(self, repository, spec_id):
        """Update transactions are saved correctly."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
        )

        assert txn.change_type == "update"
        assert txn.old_value is not None
        assert txn.new_value is not None

    async def test_save_create_transaction(self, repository, spec_id):
        """Create transactions are saved correctly."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/paths/~1users",
            old_value=None,
            new_value='{"get": {}}',
            change_type="create",
        )

        assert txn.change_type == "create"
        assert txn.old_value is None

    async def test_save_delete_transaction(self, repository, spec_id):
        """Delete transactions are saved correctly."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/paths/~1users",
            old_value='{"get": {}}',
            new_value=None,
            change_type="delete",
        )

        assert txn.change_type == "delete"
        assert txn.new_value is None


class TestMetadataTracking:
    """Tests for metadata fields."""

    async def test_timestamp_is_set(self, repository, spec_id):
        """Timestamp is automatically set on save."""
        before = datetime.utcnow()
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
        )
        after = datetime.utcnow()

        assert txn.timestamp is not None
        assert before <= txn.timestamp <= after

    async def test_edited_by_is_stored(self, repository, spec_id):
        """Edited_by metadata is stored."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
            edited_by="user@example.com",
        )

        assert txn.edited_by == "user@example.com"

    async def test_session_id_is_stored(self, repository, spec_id):
        """Session_id metadata is stored."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/field1",
            old_value="a",
            new_value="b",
            session_id="session-abc-123",
        )

        assert txn.session_id == "session-abc-123"

    async def test_all_metadata_together(self, repository, spec_id):
        """All metadata fields work together."""
        txn = await repository.save_transaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
            change_type="update",
            edited_by="alice@example.com",
            session_id="sess-xyz-789",
        )

        assert txn.edit_path == "/info/title"
        assert txn.old_value == "Old"
        assert txn.new_value == "New"
        assert txn.change_type == "update"
        assert txn.edited_by == "alice@example.com"
        assert txn.session_id == "sess-xyz-789"
        assert txn.timestamp is not None
        assert txn.sequence_number == 1
