"""
T012: Unit tests for Undo/Redo Service.

Tests for undo/redo stack management:
- Recording transactions
- Undo/redo operations
- Stack size limits (max 20)
- State consistency
- Edge cases

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import uuid4
from datetime import datetime

from src.services.undo_redo_service import (
    UndoRedoService,
    UndoRedoStack,
    StackEntry,
    UndoRedoError,
)


@pytest.fixture
def undo_redo_service():
    """Create UndoRedoService instance."""
    return UndoRedoService(max_stack_size=20)


@pytest.fixture
def spec_id():
    """Create a spec ID for testing."""
    return uuid4()


class TestUndoRedoServiceBasics:
    """Tests for basic undo/redo functionality."""

    def test_service_initializes_with_empty_stack(self, undo_redo_service, spec_id):
        """UndoRedoService initializes with empty undo/redo stacks."""
        assert not undo_redo_service.can_undo(spec_id)
        assert not undo_redo_service.can_redo(spec_id)

    def test_record_transaction_adds_to_stack(self, undo_redo_service, spec_id):
        """Recording a transaction adds it to undo stack."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
        )

        assert undo_redo_service.can_undo(spec_id)
        assert not undo_redo_service.can_redo(spec_id)

    def test_undo_restores_previous_state(self, undo_redo_service, spec_id):
        """Undo operation restores the previous state."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
        )

        # Verify we can undo
        assert undo_redo_service.can_undo(spec_id)

        # Perform undo
        undo_transaction = undo_redo_service.undo(spec_id)

        # Verify undo transaction has old values
        assert undo_transaction is not None
        assert undo_transaction.new_value == "Old Title"  # Restored value
        assert undo_transaction.old_value == "New Title"  # Previous value

    def test_redo_after_undo(self, undo_redo_service, spec_id):
        """Redo operation restores the undone state."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old Title",
            new_value="New Title",
        )

        # Perform undo
        undo_redo_service.undo(spec_id)
        assert undo_redo_service.can_redo(spec_id)

        # Perform redo
        redo_transaction = undo_redo_service.redo(spec_id)

        # Verify redo transaction has new values
        assert redo_transaction is not None
        assert redo_transaction.new_value == "New Title"

    def test_recording_after_undo_clears_redo_stack(self, undo_redo_service, spec_id):
        """Recording a new edit after undo clears the redo stack."""
        # Record first edit
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
        )

        # Undo
        undo_redo_service.undo(spec_id)
        assert undo_redo_service.can_redo(spec_id)

        # Record new edit
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/info/version",
            old_value="1.0.0",
            new_value="2.0.0",
        )

        # Redo stack should be cleared
        assert not undo_redo_service.can_redo(spec_id)


class TestUndoRedoStackLimits:
    """Tests for stack size limits."""

    def test_max_stack_size_is_20_by_default(self):
        """Default max stack size is 20."""
        service = UndoRedoService()
        assert service.max_stack_size == 20

    def test_stack_respects_max_size_limit(self, undo_redo_service, spec_id):
        """Undo stack respects maximum size limit."""
        # Record 25 edits (exceeds max of 20)
        for i in range(25):
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=f"/field/{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        # Verify stack is limited to 20
        stack = undo_redo_service.get_undo_stack(spec_id)
        assert len(stack) <= 20

    def test_oldest_edits_removed_when_stack_full(self, undo_redo_service, spec_id):
        """Oldest edits are removed when stack reaches max size."""
        # Record 25 edits
        for i in range(25):
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=f"/field/{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )

        # Get undo stack
        stack = undo_redo_service.get_undo_stack(spec_id)

        # Verify we have exactly 20 items
        assert len(stack) == 20

        # Most recent edit should be the 25th one (index 24)
        most_recent = stack[-1]
        assert most_recent.edit_path == "/field/24"

        # Oldest should be around the 6th one
        oldest = stack[0]
        assert int(oldest.edit_path.split("/")[-1]) >= 5


class TestUndoRedoSequences:
    """Tests for complex undo/redo sequences."""

    def test_multiple_undos(self, undo_redo_service, spec_id):
        """Multiple consecutive undo operations work correctly."""
        edits = [
            ("/field/1", "a", "b"),
            ("/field/2", "c", "d"),
            ("/field/3", "e", "f"),
        ]

        for path, old, new in edits:
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=path,
                old_value=old,
                new_value=new,
            )

        # Perform 3 undos
        for i in range(3):
            assert undo_redo_service.can_undo(spec_id)
            undo_redo_service.undo(spec_id)

        # No more undos available
        assert not undo_redo_service.can_undo(spec_id)

    def test_undo_redo_undo_sequence(self, undo_redo_service, spec_id):
        """Undo-redo-undo sequence works correctly."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/field",
            old_value="a",
            new_value="b",
        )

        # Undo
        undo_redo_service.undo(spec_id)
        assert undo_redo_service.can_redo(spec_id)

        # Redo
        undo_redo_service.redo(spec_id)
        assert undo_redo_service.can_undo(spec_id)

        # Undo again
        undo_redo_service.undo(spec_id)
        assert undo_redo_service.can_redo(spec_id)

    def test_multiple_redos(self, undo_redo_service, spec_id):
        """Multiple consecutive redo operations work correctly."""
        edits = [
            ("/field/1", "a", "b"),
            ("/field/2", "c", "d"),
            ("/field/3", "e", "f"),
        ]

        for path, old, new in edits:
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=path,
                old_value=old,
                new_value=new,
            )

        # Undo all 3
        for _ in range(3):
            undo_redo_service.undo(spec_id)

        # Redo all 3
        for i in range(3):
            assert undo_redo_service.can_redo(spec_id)
            undo_redo_service.redo(spec_id)

        # No more redos available
        assert not undo_redo_service.can_redo(spec_id)


class TestUndoRedoStateQueries:
    """Tests for querying undo/redo state."""

    def test_get_undo_stack(self, undo_redo_service, spec_id):
        """Can retrieve the undo stack."""
        edits = [
            ("/field/1", "a", "b"),
            ("/field/2", "c", "d"),
        ]

        for path, old, new in edits:
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=path,
                old_value=old,
                new_value=new,
            )

        stack = undo_redo_service.get_undo_stack(spec_id)
        assert len(stack) == 2
        assert stack[0].edit_path == "/field/1"
        assert stack[1].edit_path == "/field/2"

    def test_get_redo_stack(self, undo_redo_service, spec_id):
        """Can retrieve the redo stack after undo."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/field",
            old_value="a",
            new_value="b",
        )

        undo_redo_service.undo(spec_id)

        redo_stack = undo_redo_service.get_redo_stack(spec_id)
        assert len(redo_stack) == 1

    def test_get_undo_stack_for_nonexistent_spec(self, undo_redo_service, spec_id):
        """Getting undo stack for spec with no history returns empty list."""
        stack = undo_redo_service.get_undo_stack(spec_id)
        assert len(stack) == 0

    def test_get_history_returns_all_transactions(self, undo_redo_service, spec_id):
        """Getting history returns all transactions for a spec."""
        edits = [
            ("/field/1", "a", "b"),
            ("/field/2", "c", "d"),
            ("/field/3", "e", "f"),
        ]

        for path, old, new in edits:
            undo_redo_service.record_edit(
                spec_id=spec_id,
                edit_path=path,
                old_value=old,
                new_value=new,
            )

        history = undo_redo_service.get_history(spec_id)
        assert len(history) >= 3


class TestUndoRedoErrorHandling:
    """Tests for error handling in undo/redo."""

    def test_undo_on_empty_stack_returns_none(self, undo_redo_service, spec_id):
        """Undo on empty stack returns None."""
        result = undo_redo_service.undo(spec_id)
        assert result is None

    def test_redo_on_empty_redo_stack_returns_none(self, undo_redo_service, spec_id):
        """Redo on empty redo stack returns None."""
        result = undo_redo_service.redo(spec_id)
        assert result is None

    def test_clear_history_removes_all_transactions(self, undo_redo_service, spec_id):
        """Clear history removes all transactions."""
        undo_redo_service.record_edit(
            spec_id=spec_id,
            edit_path="/field",
            old_value="a",
            new_value="b",
        )

        assert undo_redo_service.can_undo(spec_id)

        undo_redo_service.clear_history(spec_id)

        assert not undo_redo_service.can_undo(spec_id)


class TestStackEntry:
    """Tests for StackEntry model."""

    def test_stack_entry_creation(self):
        """StackEntry can be created with required fields."""
        entry = StackEntry(
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
            change_type="update",
        )

        assert entry.edit_path == "/info/title"
        assert entry.old_value == "Old"
        assert entry.new_value == "New"
        assert entry.change_type == "update"

    def test_stack_entry_has_timestamp(self):
        """StackEntry automatically gets a timestamp."""
        entry = StackEntry(
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
        )

        assert entry.timestamp is not None
        assert isinstance(entry.timestamp, datetime)

    def test_stack_entry_reverse(self):
        """StackEntry can be reversed for undo."""
        entry = StackEntry(
            edit_path="/info/title",
            old_value="Old",
            new_value="New",
            change_type="update",
        )

        reversed_entry = entry.reverse()

        assert reversed_entry.old_value == "New"
        assert reversed_entry.new_value == "Old"


class TestUndoRedoStack:
    """Tests for UndoRedoStack internal model."""

    def test_stack_initializes_empty(self):
        """UndoRedoStack initializes with empty undo/redo stacks."""
        stack = UndoRedoStack(max_size=20)

        assert len(stack.undo_stack) == 0
        assert len(stack.redo_stack) == 0

    def test_push_to_undo_stack(self):
        """Can push entries to undo stack."""
        stack = UndoRedoStack(max_size=20)
        entry = StackEntry(
            edit_path="/field",
            old_value="a",
            new_value="b",
        )

        stack.push_undo(entry)

        assert len(stack.undo_stack) == 1

    def test_push_clears_redo_stack(self):
        """Pushing to undo stack clears redo stack."""
        stack = UndoRedoStack(max_size=20)

        entry1 = StackEntry(edit_path="/field/1", old_value="a", new_value="b")
        stack.push_undo(entry1)
        stack.pop_undo()

        # Now there's something in redo stack
        assert len(stack.redo_stack) == 1

        # Push a new entry
        entry2 = StackEntry(edit_path="/field/2", old_value="c", new_value="d")
        stack.push_undo(entry2)

        # Redo stack should be cleared
        assert len(stack.redo_stack) == 0

    def test_stack_respects_max_size(self):
        """Stack respects maximum size limit."""
        stack = UndoRedoStack(max_size=5)

        for i in range(10):
            entry = StackEntry(
                edit_path=f"/field/{i}",
                old_value=f"old_{i}",
                new_value=f"new_{i}",
            )
            stack.push_undo(entry)

        assert len(stack.undo_stack) <= 5


class TestUndoRedoMultipleSpecs:
    """Tests for handling multiple specs independently."""

    def test_independent_undo_redo_per_spec(self, undo_redo_service):
        """Undo/redo stacks are independent per spec."""
        spec_id_1 = uuid4()
        spec_id_2 = uuid4()

        # Record edits for spec 1
        undo_redo_service.record_edit(
            spec_id=spec_id_1,
            edit_path="/field/1",
            old_value="a",
            new_value="b",
        )

        # Record edits for spec 2
        undo_redo_service.record_edit(
            spec_id=spec_id_2,
            edit_path="/field/2",
            old_value="c",
            new_value="d",
        )

        # Undo spec 1
        undo_redo_service.undo(spec_id_1)

        # Spec 2 should still have undo capability
        assert undo_redo_service.can_undo(spec_id_2)

        # Spec 1 should not have undo capability
        assert not undo_redo_service.can_undo(spec_id_1)
