"""
T015: Undo/Redo Transaction Repository for database persistence.

Provides database operations for undo/redo history storage and retrieval
with efficient sequence ordering and per-specification tracking.

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, delete

from src.db.migrations.migration_001_create_oas_specs_table import UndoRedoTransaction


class UndoRedoRepository:
    """Repository for undo/redo transaction persistence."""

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self.session = session

    async def save_transaction(
        self,
        spec_id: UUID,
        edit_path: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        change_type: str = "update",
        edited_by: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> UndoRedoTransaction:
        """
        Save a transaction to the undo/redo history.

        Args:
            spec_id: Specification UUID
            edit_path: JSONPointer path to edited field
            old_value: Previous value
            new_value: New value
            change_type: Type of change (update, create, delete)
            edited_by: User who made the edit
            session_id: Session identifier

        Returns:
            Created UndoRedoTransaction object
        """
        # Get next sequence number for this spec
        next_seq = await self._get_next_sequence_number(spec_id)

        transaction = UndoRedoTransaction(
            spec_id=spec_id,
            edit_path=edit_path,
            old_value=old_value,
            new_value=new_value,
            change_type=change_type,
            sequence_number=next_seq,
            edited_by=edited_by,
            session_id=session_id,
        )

        self.session.add(transaction)
        await self.session.flush()
        return transaction

    async def get_undo_stack(
        self,
        spec_id: UUID,
        max_size: int = 20,
    ) -> List[UndoRedoTransaction]:
        """
        Get the undo stack for a specification.

        Returns the most recent transactions, up to max_size.

        Args:
            spec_id: Specification UUID
            max_size: Maximum number of entries to retrieve

        Returns:
            List of transactions ordered by sequence (oldest first)
        """
        stmt = (
            select(UndoRedoTransaction)
            .where(UndoRedoTransaction.spec_id == spec_id)
            .order_by(UndoRedoTransaction.sequence_number.desc())
            .limit(max_size)
        )
        result = await self.session.execute(stmt)
        transactions = result.scalars().all()
        # Reverse to get oldest first
        return list(reversed(transactions))

    async def get_history(
        self,
        spec_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[List[UndoRedoTransaction], int]:
        """
        Get transaction history with pagination.

        Args:
            spec_id: Specification UUID
            limit: Maximum number of entries
            offset: Pagination offset

        Returns:
            Tuple of (transactions list, total count)
        """
        # Get total count
        count_stmt = select(UndoRedoTransaction).where(
            UndoRedoTransaction.spec_id == spec_id
        )
        count_result = await self.session.execute(count_stmt)
        total = len(count_result.scalars().all())

        # Get paginated results
        stmt = (
            select(UndoRedoTransaction)
            .where(UndoRedoTransaction.spec_id == spec_id)
            .order_by(UndoRedoTransaction.sequence_number)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        transactions = result.scalars().all()

        return list(transactions), total

    async def clear_history(self, spec_id: UUID) -> int:
        """
        Clear all transaction history for a specification.

        Args:
            spec_id: Specification UUID

        Returns:
            Number of transactions deleted
        """
        stmt = delete(UndoRedoTransaction).where(
            UndoRedoTransaction.spec_id == spec_id
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def get_max_sequence(self, spec_id: UUID) -> int:
        """
        Get the maximum sequence number for a specification.

        Args:
            spec_id: Specification UUID

        Returns:
            Maximum sequence number, or 0 if no transactions
        """
        stmt = (
            select(UndoRedoTransaction.sequence_number)
            .where(UndoRedoTransaction.spec_id == spec_id)
            .order_by(UndoRedoTransaction.sequence_number.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        max_seq = result.scalars().first()
        return max_seq if max_seq is not None else 0

    async def _get_next_sequence_number(self, spec_id: UUID) -> int:
        """
        Get the next sequence number for a specification.

        Args:
            spec_id: Specification UUID

        Returns:
            Next sequence number
        """
        max_seq = await self.get_max_sequence(spec_id)
        return max_seq + 1

    async def get_transaction_count(self, spec_id: UUID) -> int:
        """
        Get total transaction count for a specification.

        Args:
            spec_id: Specification UUID

        Returns:
            Number of transactions
        """
        stmt = select(UndoRedoTransaction).where(
            UndoRedoTransaction.spec_id == spec_id
        )
        result = await self.session.execute(stmt)
        return len(result.scalars().all())

    async def get_recent_transactions(
        self,
        spec_id: UUID,
        count: int = 20,
    ) -> List[UndoRedoTransaction]:
        """
        Get the most recent transactions.

        Args:
            spec_id: Specification UUID
            count: Number of recent transactions to retrieve

        Returns:
            List of transactions ordered by sequence (newest first)
        """
        stmt = (
            select(UndoRedoTransaction)
            .where(UndoRedoTransaction.spec_id == spec_id)
            .order_by(UndoRedoTransaction.sequence_number.desc())
            .limit(count)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
