"""
T003: Unit tests for OAS Edit Transaction Tracker Service.

Tests for transaction recording, undo/redo, path-based rollback,
and change history retrieval.

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import UUID

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.db.oas_repository import OASRepository
from src.db.migrations.migration_001_create_oas_specs_table import Base
from src.services.oas_transaction_tracker import (
    EditTransaction,
    ChangeSet,
    OASTransactionTracker,
    create_audit_trail,
)


# Test fixtures
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


@pytest.fixture
async def tracker(repository):
    """Create OASTransactionTracker instance."""
    return OASTransactionTracker(repository)


@pytest.fixture
async def spec_with_transactions(repository):
    """Create a spec with some transactions."""
    from src.db.migrations.migration_001_create_oas_specs_table import OASSpec

    spec = await repository.save_spec(
        spec_id="test-api",
        oas_content="initial content",
    )
    await repository.commit()

    # Record 3 transactions
    await repository.record_transaction(
        spec_id=spec.id,
        edit_path="/info/title",
        old_value="Old Title",
        new_value="New Title",
        change_type="update",
        edited_by="alice@example.com",
        session_id="session-001",
    )

    await repository.record_transaction(
        spec_id=spec.id,
        edit_path="/info/version",
        old_value=None,
        new_value="1.0.0",
        change_type="create",
        edited_by="bob@example.com",
        session_id="session-001",
    )

    await repository.record_transaction(
        spec_id=spec.id,
        edit_path="/info/description",
        old_value="Old desc",
        new_value="New desc",
        change_type="update",
        edited_by="alice@example.com",
        session_id="session-002",
    )
    await repository.commit()

    return spec


class TestEditTransaction:
    """Tests for EditTransaction class."""

    def test_create_edit_transaction(self):
        """Create an edit transaction."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transaction = EditTransaction(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
            edited_by="alice@example.com",
            session_id="session-001",
        )

        assert transaction.spec_id == spec_id
        assert transaction.edit_path == "/info/title"
        assert transaction.old_value == "Old Title"
        assert transaction.new_value == "New Title"
        assert transaction.change_type == "update"
        assert transaction.edited_by == "alice@example.com"
        assert transaction.session_id == "session-001"

    def test_reverse_update_transaction(self):
        """Reverse an update transaction swaps old/new values."""
        transaction = EditTransaction(
            spec_id=UUID("12345678-1234-5678-1234-567812345678"),
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
        )

        reversed_tx = transaction.reverse()
        assert reversed_tx.old_value == "New Title"  # Swapped
        assert reversed_tx.new_value == "Old Title"  # Swapped
        assert reversed_tx.change_type == "update"

    def test_reverse_create_transaction(self):
        """Reverse a create transaction becomes delete."""
        transaction = EditTransaction(
            spec_id=UUID("12345678-1234-5678-1234-567812345678"),
            edit_path="/info/version",
            old_value=None,
            new_value="1.0.0",
            change_type="create",
        )

        reversed_tx = transaction.reverse()
        assert reversed_tx.old_value == "1.0.0"  # Swapped
        assert reversed_tx.new_value is None  # Swapped
        assert reversed_tx.change_type == "delete"

    def test_reverse_delete_transaction(self):
        """Reverse a delete transaction becomes create."""
        transaction = EditTransaction(
            spec_id=UUID("12345678-1234-5678-1234-567812345678"),
            edit_path="/servers/0",
            old_value="https://api.example.com",
            new_value=None,
            change_type="delete",
        )

        reversed_tx = transaction.reverse()
        assert reversed_tx.old_value is None  # Swapped
        assert reversed_tx.new_value == "https://api.example.com"  # Swapped
        assert reversed_tx.change_type == "create"


class TestChangeSet:
    """Tests for ChangeSet class."""

    def test_create_changeset(self):
        """Create a changeset with transactions."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="Old",
                new_value="New",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/version",
                old_value=None,
                new_value="1.0.0",
                change_type="create",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)

        assert changeset.spec_id == spec_id
        assert len(changeset) == 2
        assert len(changeset.affected_paths) == 2

    def test_changeset_affected_paths(self):
        """ChangeSet computes affected paths."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="A",
                new_value="B",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="B",
                new_value="C",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/version",
                old_value=None,
                new_value="1.0",
                change_type="create",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)

        # Should have 2 unique paths despite 3 transactions
        assert len(changeset.affected_paths) == 2
        assert "/info/title" in changeset.affected_paths
        assert "/info/version" in changeset.affected_paths

    def test_changeset_filter_by_type(self):
        """Filter transactions by type."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path1",
                old_value="A",
                new_value="B",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path2",
                old_value=None,
                new_value="C",
                change_type="create",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path3",
                old_value=None,
                new_value="D",
                change_type="create",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)

        updates = changeset.get_transactions_by_type("update")
        creates = changeset.get_transactions_by_type("create")

        assert len(updates) == 1
        assert len(creates) == 2

    def test_changeset_reverse_changelog(self):
        """Generate reverse changelog for undo."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="A",
                new_value="B",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/version",
                old_value=None,
                new_value="1.0",
                change_type="create",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)
        reverse = changeset.generate_reverse_changelog()

        # Reverse should have transactions in opposite order
        assert len(reverse.transactions) == 2
        assert reverse.transactions[0].edit_path == "/info/version"
        assert reverse.transactions[0].change_type == "delete"
        assert reverse.transactions[1].edit_path == "/info/title"
        assert reverse.transactions[1].change_type == "update"


class TestOASTransactionTracker:
    """Tests for OASTransactionTracker."""

    async def test_record_edit_transaction(self, tracker, repository):
        """Record an edit transaction."""
        spec = await repository.save_spec(
            spec_id="test-api",
            oas_content="content",
        )
        await repository.commit()

        transaction = await tracker.record_edit(
            spec_id=spec.id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
            change_type="update",
            edited_by="alice@example.com",
            session_id="session-001",
        )

        assert transaction.edit_path == "/info/title"
        assert transaction.old_value == "Old Title"
        assert transaction.new_value == "New Title"

    async def test_get_history(self, tracker, spec_with_transactions):
        """Get change history for a spec."""
        history = await tracker.get_history(spec_with_transactions.id, limit=100)

        assert len(history.transactions) == 3
        # Most recent first
        assert history.transactions[0].edit_path == "/info/description"
        assert history.transactions[1].edit_path == "/info/version"
        assert history.transactions[2].edit_path == "/info/title"

    async def test_get_path_history(self, tracker, spec_with_transactions):
        """Get change history for a specific path."""
        path_history = await tracker.get_path_history(
            spec_with_transactions.id,
            "/info/title",
        )

        assert len(path_history.transactions) == 1
        assert path_history.transactions[0].edit_path == "/info/title"
        assert path_history.transactions[0].old_value == "Old Title"
        assert path_history.transactions[0].new_value == "New Title"

    async def test_get_session_changes(self, tracker, spec_with_transactions):
        """Get all changes in a session."""
        session_changes = await tracker.get_session_changes(
            spec_with_transactions.id,
            "session-001",
        )

        assert len(session_changes.transactions) == 2
        paths = {t.edit_path for t in session_changes.transactions}
        assert "/info/title" in paths
        assert "/info/version" in paths

    def test_generate_reverse_changelog(self, tracker):
        """Generate reverse changelog."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/title",
                old_value="A",
                new_value="B",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/info/version",
                old_value=None,
                new_value="1.0",
                change_type="create",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)
        reverse = tracker.generate_reverse_changelog(changeset)

        # Should be reversed
        assert len(reverse.transactions) == 2
        assert reverse.transactions[0].change_type == "delete"
        assert reverse.transactions[1].change_type == "update"

    async def test_rollback_path(self, tracker, spec_with_transactions):
        """Get reverse transactions for path rollback."""
        rollback = await tracker.rollback_path(
            spec_with_transactions.id,
            "/info/title",
        )

        assert rollback is not None
        assert len(rollback.transactions) == 1
        assert rollback.transactions[0].change_type == "update"
        assert rollback.transactions[0].old_value == "New Title"
        assert rollback.transactions[0].new_value == "Old Title"

    async def test_rollback_path_returns_none_for_missing_path(
        self, tracker, spec_with_transactions
    ):
        """Rollback returns None for path with no edits."""
        rollback = await tracker.rollback_path(
            spec_with_transactions.id,
            "/nonexistent/path",
        )

        assert rollback is None

    async def test_rollback_range(self, tracker, spec_with_transactions):
        """Get reverse transactions for recent N edits."""
        # Rollback last 2 edits
        rollback = await tracker.rollback_range(
            spec_with_transactions.id,
            num_edits=2,
        )

        assert rollback is not None
        assert len(rollback.transactions) == 2

        # History returns most recent first: [/info/description, /info/version]
        # After reversal for undo: [/info/version (reversed), /info/description (reversed)]
        assert rollback.transactions[0].edit_path == "/info/version"
        assert rollback.transactions[1].edit_path == "/info/description"

    def test_compute_diff(self, tracker):
        """Compute diff statistics for a changeset."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")
        transactions = [
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path1",
                old_value="A",
                new_value="B",
                change_type="update",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path2",
                old_value=None,
                new_value="C",
                change_type="create",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path3",
                old_value="D",
                new_value=None,
                change_type="delete",
            ),
            EditTransaction(
                spec_id=spec_id,
                edit_path="/path1",
                old_value="E",
                new_value="F",
                change_type="update",
            ),
        ]

        changeset = ChangeSet(spec_id=spec_id, transactions=transactions)
        diff = tracker.compute_diff(changeset)

        assert diff["total_edits"] == 4
        assert diff["affected_paths"] == 3
        assert diff["creates"] == 1
        assert diff["updates"] == 2
        assert diff["deletes"] == 1

    def test_filter_changesets_by_editor(self, tracker):
        """Filter changesets by editor."""
        spec_id = UUID("12345678-1234-5678-1234-567812345678")

        changeset1 = ChangeSet(
            spec_id=spec_id,
            transactions=[
                EditTransaction(
                    spec_id=spec_id,
                    edit_path="/p1",
                    old_value="A",
                    new_value="B",
                    change_type="update",
                    edited_by="alice@example.com",
                )
            ],
        )

        changeset2 = ChangeSet(
            spec_id=spec_id,
            transactions=[
                EditTransaction(
                    spec_id=spec_id,
                    edit_path="/p2",
                    old_value="C",
                    new_value="D",
                    change_type="update",
                    edited_by="bob@example.com",
                )
            ],
        )

        filtered = tracker.filter_changesets(
            [changeset1, changeset2],
            edited_by="alice@example.com",
        )

        assert len(filtered) == 1
        assert filtered[0] == changeset1


class TestAuditTrail:
    """Tests for audit trail creation."""

    async def test_create_audit_trail(self, tracker, spec_with_transactions):
        """Create complete audit trail for a spec."""
        audit = await create_audit_trail(tracker, spec_with_transactions.id)

        assert audit["spec_id"] == str(spec_with_transactions.id)
        assert audit["total_edits"] == 3
        assert len(audit["affected_paths"]) == 3
        assert audit["changes_by_type"]["update"] == 2
        assert audit["changes_by_type"]["create"] == 1
        assert audit["changes_by_type"]["delete"] == 0
        assert "alice@example.com" in audit["editors"]
        assert "bob@example.com" in audit["editors"]
        assert "session-001" in audit["sessions"]
        assert "session-002" in audit["sessions"]
