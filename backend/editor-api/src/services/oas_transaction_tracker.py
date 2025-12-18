"""
T003: OAS Edit Transaction Tracker Service.

Provides transaction management for OAS specifications:
- Async transaction recording and retrieval
- Reverse changelog generation for undo/redo
- Path-based rollback operations
- Change diff generation

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from src.db.oas_repository import OASRepository
from src.db.migrations.migration_001_create_oas_specs_table import OASEditTransaction
from src.utils.oas_path import OASPath


class EditTransaction:
    """Represents a single edit transaction."""

    def __init__(
        self,
        spec_id: UUID,
        edit_path: str,
        old_value: Optional[str],
        new_value: Optional[str],
        change_type: str = "update",
        edited_by: Optional[str] = None,
        session_id: Optional[str] = None,
    ):
        """Initialize an edit transaction."""
        self.spec_id = spec_id
        self.edit_path = edit_path
        self.old_value = old_value
        self.new_value = new_value
        self.change_type = change_type
        self.edited_by = edited_by
        self.session_id = session_id
        self.timestamp = datetime.utcnow()

    def reverse(self) -> "EditTransaction":
        """
        Create reverse transaction for undo operation.

        Swaps old_value and new_value, reverses change_type.
        """
        reverse_type = self.change_type
        if self.change_type == "create":
            reverse_type = "delete"
        elif self.change_type == "delete":
            reverse_type = "create"

        return EditTransaction(
            spec_id=self.spec_id,
            edit_path=self.edit_path,
            old_value=self.new_value,  # Swapped
            new_value=self.old_value,  # Swapped
            change_type=reverse_type,
            edited_by=self.edited_by,
            session_id=self.session_id,
        )

    @staticmethod
    def from_orm(orm_obj: OASEditTransaction) -> "EditTransaction":
        """Convert ORM object to EditTransaction."""
        return EditTransaction(
            spec_id=orm_obj.spec_id,
            edit_path=orm_obj.edit_path,
            old_value=orm_obj.old_value,
            new_value=orm_obj.new_value,
            change_type=orm_obj.change_type,
            edited_by=orm_obj.edited_by,
            session_id=orm_obj.session_id,
        )


class ChangeSet:
    """Represents a set of changes for a specific time range or context."""

    def __init__(
        self,
        spec_id: UUID,
        transactions: List[EditTransaction],
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ):
        """Initialize a changeset."""
        self.spec_id = spec_id
        self.transactions = transactions
        self.start_time = start_time
        self.end_time = end_time
        self.affected_paths = self._compute_affected_paths()

    def _compute_affected_paths(self) -> set:
        """Compute set of all affected paths in this changeset."""
        return {t.edit_path for t in self.transactions}

    def get_transactions_for_path(self, path: str) -> List[EditTransaction]:
        """Get all transactions for a specific path."""
        return [t for t in self.transactions if t.edit_path == path]

    def get_transactions_by_type(self, change_type: str) -> List[EditTransaction]:
        """Get all transactions of a specific type."""
        return [t for t in self.transactions if t.change_type == change_type]

    def generate_reverse_changelog(self) -> "ChangeSet":
        """Generate reverse changeset for undo operation."""
        # Reverse in opposite order
        reversed_transactions = [t.reverse() for t in reversed(self.transactions)]
        return ChangeSet(
            spec_id=self.spec_id,
            transactions=reversed_transactions,
            start_time=self.end_time,
            end_time=self.start_time,
        )

    def __len__(self) -> int:
        """Return number of transactions in changeset."""
        return len(self.transactions)

    def __repr__(self) -> str:
        """String representation."""
        return f"ChangeSet({len(self.transactions)} transactions, paths={len(self.affected_paths)})"


class OASTransactionTracker:
    """
    Manages OAS specification transactions for undo/redo and rollback.

    Provides:
    - Transaction recording with user attribution
    - Reverse changelog generation
    - Path-based rollback
    - Change history retrieval
    """

    def __init__(self, repository: OASRepository):
        """Initialize with OASRepository."""
        self.repository = repository

    async def record_edit(
        self,
        spec_id: UUID,
        edit_path: str,
        old_value: Optional[str],
        new_value: Optional[str],
        change_type: str = "update",
        edited_by: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> EditTransaction:
        """
        Record an edit transaction.

        Args:
            spec_id: UUID of the spec being edited
            edit_path: JSONPointer format path to edited field
            old_value: Previous value (or None for create)
            new_value: New value (or None for delete)
            change_type: "create", "update", or "delete"
            edited_by: User who made the edit
            session_id: Session identifier for grouping related edits

        Returns:
            EditTransaction object
        """
        orm_transaction = await self.repository.record_transaction(
            spec_id=spec_id,
            edit_path=edit_path,
            old_value=old_value,
            new_value=new_value,
            change_type=change_type,
            edited_by=edited_by,
            session_id=session_id,
        )
        await self.repository.commit()
        return EditTransaction.from_orm(orm_transaction)

    async def get_history(
        self,
        spec_id: UUID,
        limit: int = 100,
    ) -> ChangeSet:
        """
        Retrieve change history for a spec.

        Args:
            spec_id: UUID of the spec
            limit: Maximum number of transactions to retrieve

        Returns:
            ChangeSet containing all transactions (most recent first)
        """
        orm_transactions = await self.repository.get_transactions(spec_id, limit=limit)
        transactions = [EditTransaction.from_orm(t) for t in orm_transactions]
        return ChangeSet(
            spec_id=spec_id,
            transactions=transactions,
        )

    async def get_path_history(
        self,
        spec_id: UUID,
        edit_path: str,
    ) -> ChangeSet:
        """
        Retrieve change history for a specific path.

        Args:
            spec_id: UUID of the spec
            edit_path: JSONPointer format path

        Returns:
            ChangeSet containing transactions for this path
        """
        orm_transactions = await self.repository.get_transactions_for_path(
            spec_id, edit_path
        )
        transactions = [EditTransaction.from_orm(t) for t in orm_transactions]
        return ChangeSet(
            spec_id=spec_id,
            transactions=transactions,
        )

    async def get_session_changes(
        self,
        spec_id: UUID,
        session_id: str,
    ) -> ChangeSet:
        """
        Retrieve all changes in a session.

        Args:
            spec_id: UUID of the spec
            session_id: Session identifier

        Returns:
            ChangeSet containing all transactions in this session
        """
        history = await self.get_history(spec_id, limit=1000)
        session_transactions = [
            t for t in history.transactions if t.session_id == session_id
        ]
        return ChangeSet(
            spec_id=spec_id,
            transactions=session_transactions,
        )

    def generate_reverse_changelog(self, changeset: ChangeSet) -> ChangeSet:
        """
        Generate reverse changeset for undo operation.

        Args:
            changeset: ChangeSet to reverse

        Returns:
            Reverse ChangeSet (ready to apply to undo changes)
        """
        return changeset.generate_reverse_changelog()

    async def rollback_path(
        self,
        spec_id: UUID,
        edit_path: str,
    ) -> Optional[ChangeSet]:
        """
        Get the reverse transactions needed to rollback a specific path.

        This retrieves the history for a path and generates the reverse
        transactions needed to undo all edits to that path.

        Args:
            spec_id: UUID of the spec
            edit_path: JSONPointer format path to rollback

        Returns:
            ChangeSet with reverse transactions, or None if no edits on path
        """
        path_history = await self.get_path_history(spec_id, edit_path)

        if not path_history.transactions:
            return None

        return self.generate_reverse_changelog(path_history)

    async def rollback_range(
        self,
        spec_id: UUID,
        num_edits: int,
    ) -> Optional[ChangeSet]:
        """
        Get reverse transactions for last N edits.

        Args:
            spec_id: UUID of the spec
            num_edits: Number of recent edits to rollback

        Returns:
            ChangeSet with reverse transactions for those edits
        """
        history = await self.get_history(spec_id, limit=num_edits)

        if not history.transactions:
            return None

        # Take only the most recent N transactions
        recent = history.transactions[:num_edits]
        changeset = ChangeSet(
            spec_id=spec_id,
            transactions=recent,
        )

        return self.generate_reverse_changelog(changeset)

    def compute_diff(self, changeset: ChangeSet) -> Dict[str, Any]:
        """
        Compute diff summary for a changeset.

        Args:
            changeset: ChangeSet to analyze

        Returns:
            Dictionary with diff statistics
        """
        diff = {
            "total_edits": len(changeset.transactions),
            "affected_paths": len(changeset.affected_paths),
            "creates": len(changeset.get_transactions_by_type("create")),
            "updates": len(changeset.get_transactions_by_type("update")),
            "deletes": len(changeset.get_transactions_by_type("delete")),
            "paths": sorted(list(changeset.affected_paths)),
        }
        return diff

    def filter_changesets(
        self,
        changesets: List[ChangeSet],
        edited_by: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[ChangeSet]:
        """
        Filter changesets by criteria.

        Args:
            changesets: List of ChangeSet objects to filter
            edited_by: Filter by user (case-insensitive)
            start_time: Filter by start time
            end_time: Filter by end time

        Returns:
            Filtered list of ChangeSet objects
        """
        result = []

        for changeset in changesets:
            # Filter by user
            if edited_by is not None:
                if not any(
                    t.edited_by and t.edited_by.lower() == edited_by.lower()
                    for t in changeset.transactions
                ):
                    continue

            # Filter by time range
            if start_time is not None:
                if changeset.end_time and changeset.end_time < start_time:
                    continue

            if end_time is not None:
                if changeset.start_time and changeset.start_time > end_time:
                    continue

            result.append(changeset)

        return result


# Utility functions for transaction operations
async def create_audit_trail(
    tracker: OASTransactionTracker,
    spec_id: UUID,
) -> Dict[str, Any]:
    """
    Create a complete audit trail for a spec.

    Args:
        tracker: OASTransactionTracker instance
        spec_id: UUID of the spec

    Returns:
        Dictionary with audit information
    """
    history = await tracker.get_history(spec_id, limit=1000)

    audit = {
        "spec_id": str(spec_id),
        "total_edits": len(history.transactions),
        "affected_paths": sorted(list(history.affected_paths)),
        "changes_by_type": {
            "create": len(history.get_transactions_by_type("create")),
            "update": len(history.get_transactions_by_type("update")),
            "delete": len(history.get_transactions_by_type("delete")),
        },
        "editors": list(
            {t.edited_by for t in history.transactions if t.edited_by}
        ),
        "sessions": list({t.session_id for t in history.transactions if t.session_id}),
    }

    return audit
