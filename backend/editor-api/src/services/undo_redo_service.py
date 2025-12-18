"""
T012: Undo/Redo Service.

Provides undo/redo stack management for OAS specifications:
- Record edit transactions
- Undo/redo operations with max 20-level stack
- State query and history retrieval
- Per-specification history tracking
- Automatic stack size management

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class StackEntry(BaseModel):
    """Represents a single edit transaction in undo/redo stack."""

    edit_path: str = Field(..., description="JSONPointer path to edited field")
    old_value: Optional[str] = Field(None, description="Previous value")
    new_value: Optional[str] = Field(None, description="New value")
    change_type: str = Field(default="update", description="Type: create, update, delete")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Edit timestamp")
    edited_by: Optional[str] = Field(None, description="User who made the edit")
    session_id: Optional[str] = Field(None, description="Session identifier")

    def reverse(self) -> "StackEntry":
        """
        Create reverse entry for undo operation.

        Swaps old_value and new_value, reverses change_type.
        """
        reverse_type = self.change_type
        if self.change_type == "create":
            reverse_type = "delete"
        elif self.change_type == "delete":
            reverse_type = "create"

        return StackEntry(
            edit_path=self.edit_path,
            old_value=self.new_value,  # Swapped
            new_value=self.old_value,  # Swapped
            change_type=reverse_type,
            timestamp=self.timestamp,
            edited_by=self.edited_by,
            session_id=self.session_id,
        )


class UndoRedoStack:
    """Internal stack management for a single specification."""

    def __init__(self, max_size: int = 20):
        """
        Initialize undo/redo stacks.

        Args:
            max_size: Maximum size of undo stack
        """
        self.max_size = max_size
        self.undo_stack: List[StackEntry] = []
        self.redo_stack: List[StackEntry] = []

    def push_undo(self, entry: StackEntry) -> None:
        """
        Push entry to undo stack.

        Clears redo stack when new edit is made.
        """
        self.undo_stack.append(entry)
        self.redo_stack.clear()

        # Enforce max size
        if len(self.undo_stack) > self.max_size:
            self.undo_stack.pop(0)

    def pop_undo(self) -> Optional[StackEntry]:
        """Pop entry from undo stack and move to redo stack."""
        if not self.undo_stack:
            return None
        entry = self.undo_stack.pop()
        self.redo_stack.append(entry)
        return entry

    def push_redo(self, entry: StackEntry) -> None:
        """Push entry to redo stack."""
        self.redo_stack.append(entry)

        # Enforce max size
        if len(self.redo_stack) > self.max_size:
            self.redo_stack.pop(0)

    def pop_redo(self) -> Optional[StackEntry]:
        """Pop entry from redo stack and move to undo stack (without clearing redo)."""
        if not self.redo_stack:
            return None
        entry = self.redo_stack.pop()
        self.undo_stack.append(entry)
        return entry

    def can_undo(self) -> bool:
        """Check if undo is available."""
        return len(self.undo_stack) > 0

    def can_redo(self) -> bool:
        """Check if redo is available."""
        return len(self.redo_stack) > 0

    def clear(self) -> None:
        """Clear all undo and redo history."""
        self.undo_stack.clear()
        self.redo_stack.clear()


class UndoRedoError(Exception):
    """Undo/redo specific exception."""

    pass


class UndoRedoService:
    """
    Manages undo/redo operations for OAS specifications.

    Maintains separate undo/redo stacks per specification with a maximum
    of 20 entries per stack.
    """

    def __init__(self, max_stack_size: int = 20):
        """
        Initialize UndoRedoService.

        Args:
            max_stack_size: Maximum size of undo stack (default: 20)
        """
        self.max_stack_size = max_stack_size
        self._stacks: Dict[UUID, UndoRedoStack] = {}

    def _get_stack(self, spec_id: UUID) -> UndoRedoStack:
        """Get or create stack for spec."""
        if spec_id not in self._stacks:
            self._stacks[spec_id] = UndoRedoStack(max_size=self.max_stack_size)
        return self._stacks[spec_id]

    def record_edit(
        self,
        spec_id: UUID,
        edit_path: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        change_type: str = "update",
        edited_by: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> StackEntry:
        """
        Record an edit transaction.

        Args:
            spec_id: Specification UUID
            edit_path: JSONPointer path to edited field
            old_value: Previous value
            new_value: New value
            change_type: Type of change (create, update, delete)
            edited_by: User who made the edit
            session_id: Session identifier

        Returns:
            StackEntry that was recorded
        """
        entry = StackEntry(
            edit_path=edit_path,
            old_value=old_value,
            new_value=new_value,
            change_type=change_type,
            edited_by=edited_by,
            session_id=session_id,
        )

        stack = self._get_stack(spec_id)
        stack.push_undo(entry)

        return entry

    def undo(self, spec_id: UUID) -> Optional[StackEntry]:
        """
        Undo the last edit.

        Returns the reversed transaction needed to undo the last edit.

        Args:
            spec_id: Specification UUID

        Returns:
            Reversed StackEntry to apply as undo, or None if no undo available
        """
        stack = self._get_stack(spec_id)

        if not stack.can_undo():
            return None

        entry = stack.pop_undo()
        if entry is None:
            return None

        # Reverse the entry and return for application
        # Note: pop_undo automatically moves entry to redo stack
        return entry.reverse()

    def redo(self, spec_id: UUID) -> Optional[StackEntry]:
        """
        Redo the last undone edit.

        Returns the transaction needed to redo the last undone edit.

        Args:
            spec_id: Specification UUID

        Returns:
            StackEntry to apply as redo, or None if no redo available
        """
        stack = self._get_stack(spec_id)

        if not stack.can_redo():
            return None

        entry = stack.pop_redo()
        if entry is None:
            return None

        # pop_redo automatically moves entry back to undo stack
        # Return the entry to apply
        return entry

    def can_undo(self, spec_id: UUID) -> bool:
        """
        Check if undo is available.

        Args:
            spec_id: Specification UUID

        Returns:
            True if undo is available
        """
        stack = self._get_stack(spec_id)
        return stack.can_undo()

    def can_redo(self, spec_id: UUID) -> bool:
        """
        Check if redo is available.

        Args:
            spec_id: Specification UUID

        Returns:
            True if redo is available
        """
        stack = self._get_stack(spec_id)
        return stack.can_redo()

    def get_undo_stack(self, spec_id: UUID) -> List[StackEntry]:
        """
        Get the current undo stack.

        Args:
            spec_id: Specification UUID

        Returns:
            List of StackEntry objects in undo stack
        """
        stack = self._get_stack(spec_id)
        return list(stack.undo_stack)

    def get_redo_stack(self, spec_id: UUID) -> List[StackEntry]:
        """
        Get the current redo stack.

        Args:
            spec_id: Specification UUID

        Returns:
            List of StackEntry objects in redo stack
        """
        stack = self._get_stack(spec_id)
        return list(stack.redo_stack)

    def get_history(self, spec_id: UUID) -> List[StackEntry]:
        """
        Get complete history (undo + redo stacks).

        Args:
            spec_id: Specification UUID

        Returns:
            Combined list of all transactions
        """
        stack = self._get_stack(spec_id)
        # Return undo stack + redo stack (redo in reverse order for chronological order)
        return list(stack.undo_stack) + list(reversed(stack.redo_stack))

    def clear_history(self, spec_id: UUID) -> None:
        """
        Clear all undo/redo history for a spec.

        Args:
            spec_id: Specification UUID
        """
        stack = self._get_stack(spec_id)
        stack.clear()

    def get_undo_redo_status(self, spec_id: UUID) -> Dict[str, Any]:
        """
        Get undo/redo status for a spec.

        Args:
            spec_id: Specification UUID

        Returns:
            Dictionary with status information
        """
        stack = self._get_stack(spec_id)

        return {
            "can_undo": stack.can_undo(),
            "can_redo": stack.can_redo(),
            "undo_stack_size": len(stack.undo_stack),
            "redo_stack_size": len(stack.redo_stack),
            "max_stack_size": self.max_stack_size,
        }

    def get_all_specs_status(self) -> Dict[UUID, Dict[str, Any]]:
        """
        Get undo/redo status for all tracked specs.

        Returns:
            Dictionary mapping spec IDs to their status
        """
        return {spec_id: self.get_undo_redo_status(spec_id) for spec_id in self._stacks}


# Convenient imports
__all__ = [
    "UndoRedoService",
    "UndoRedoStack",
    "StackEntry",
    "UndoRedoError",
]
