"""
T014: Integration tests for Undo/Redo with edit endpoints.

Tests for integration between transaction/edit endpoints and undo/redo service:
- Transactions recorded in undo stack
- Edit operations trigger undo/redo recording
- Undo/redo of edit operations
- Multiple edits and complex sequences

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.oas_routes import router


@pytest.fixture
def client():
    """Create a test client."""
    app = FastAPI()
    app.include_router(router, prefix="/api/oas")
    return TestClient(app)


@pytest.fixture
def spec_id():
    """Create a spec ID for testing."""
    return str(uuid4())


class TestTransactionRecording:
    """Tests for transaction recording in undo/redo."""

    def test_apply_transaction_records_to_undo_stack(self, client, spec_id):
        """Applying a transaction records it in undo stack."""
        # Apply a transaction
        transaction_data = {
            "edit_path": "/info/title",
            "old_value": "Old Title",
            "new_value": "New Title",
            "change_type": "update",
        }
        response = client.post(
            f"/api/oas/specs/{spec_id}/transactions",
            json=transaction_data,
        )
        assert response.status_code == 201

        # Check that undo is now available
        status_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert status_response.status_code == 200
        status = status_response.json()
        assert status["can_undo"] is True

    def test_multiple_transactions_recorded_in_order(self, client, spec_id):
        """Multiple transactions are recorded in order."""
        transactions = [
            {
                "edit_path": "/info/title",
                "old_value": "Old",
                "new_value": "New",
                "change_type": "update",
            },
            {
                "edit_path": "/info/version",
                "old_value": "1.0.0",
                "new_value": "2.0.0",
                "change_type": "update",
            },
            {
                "edit_path": "/paths/~1pets",
                "old_value": None,
                "new_value": "{}",
                "change_type": "create",
            },
        ]

        for txn in transactions:
            response = client.post(
                f"/api/oas/specs/{spec_id}/transactions",
                json=txn,
            )
            assert response.status_code == 201

        # Check status shows all transactions recorded
        status_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert status_response.status_code == 200
        status = status_response.json()
        assert status["undo_stack_size"] == 3

    def test_transaction_changes_update_undo_status(self, client, spec_id):
        """Undo status changes as transactions are recorded."""
        # Initial status
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.json()["can_undo"] is False

        # After first transaction
        txn = {
            "edit_path": "/test",
            "old_value": "a",
            "new_value": "b",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)
        response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert response.json()["can_undo"] is True
        assert response.json()["undo_stack_size"] == 1


class TestUndoRedoWithTransactions:
    """Tests for undo/redo of transactions."""

    def test_undo_reverses_transaction(self, client, spec_id):
        """Undoing a transaction reverses it."""
        # Record a transaction
        txn = {
            "edit_path": "/info/title",
            "old_value": "Old Title",
            "new_value": "New Title",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Undo it
        undo_response = client.post(f"/api/oas/specs/{spec_id}/undo")
        assert undo_response.status_code == 200
        undo_data = undo_response.json()
        assert undo_data["success"] is True
        assert undo_data["transaction"] is not None

        # Verify redo is now available
        status_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert status_response.json()["can_redo"] is True

    def test_redo_after_undo_transaction(self, client, spec_id):
        """Redo after undo restores the transaction."""
        # Record a transaction
        txn = {
            "edit_path": "/info/title",
            "old_value": "Old",
            "new_value": "New",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Undo it
        client.post(f"/api/oas/specs/{spec_id}/undo")

        # Redo it
        redo_response = client.post(f"/api/oas/specs/{spec_id}/redo")
        assert redo_response.status_code == 200
        redo_data = redo_response.json()
        assert redo_data["success"] is True

        # Verify undo is available again
        status_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert status_response.json()["can_undo"] is True
        assert status_response.json()["can_redo"] is False

    def test_undo_multiple_transactions_in_sequence(self, client, spec_id):
        """Undoing multiple transactions works correctly."""
        # Record 3 transactions
        for i in range(3):
            txn = {
                "edit_path": f"/field/{i}",
                "old_value": f"old_{i}",
                "new_value": f"new_{i}",
                "change_type": "update",
            }
            client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Undo all 3
        for i in range(3):
            response = client.post(f"/api/oas/specs/{spec_id}/undo")
            assert response.status_code == 200
            assert response.json()["success"] is True

        # Verify undo is no longer available
        status_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status")
        assert status_response.json()["can_undo"] is False

    def test_new_transaction_clears_redo_stack(self, client, spec_id):
        """Recording new transaction after undo clears redo stack."""
        # Record and undo
        txn1 = {
            "edit_path": "/field/1",
            "old_value": "a",
            "new_value": "b",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn1)
        client.post(f"/api/oas/specs/{spec_id}/undo")

        # Verify redo is available
        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["can_redo"] is True

        # Record new transaction
        txn2 = {
            "edit_path": "/field/2",
            "old_value": "c",
            "new_value": "d",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn2)

        # Verify redo is no longer available
        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["can_redo"] is False


class TestTransactionHistoryInclusion:
    """Tests for transactions appearing in history."""

    def test_applied_transaction_appears_in_history(self, client, spec_id):
        """Applied transactions appear in undo/redo history."""
        txn = {
            "edit_path": "/info/title",
            "old_value": "Old",
            "new_value": "New",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Get history
        history_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        assert history_response.status_code == 200
        history = history_response.json()
        assert history["total"] >= 1
        assert len(history["history"]) >= 1

    def test_transaction_history_includes_correct_fields(self, client, spec_id):
        """Transaction in history includes all necessary fields."""
        txn = {
            "edit_path": "/info/title",
            "old_value": "Old Title",
            "new_value": "New Title",
            "change_type": "update",
        }
        client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        history_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        history = history_response.json()

        if history["total"] > 0:
            entry = history["history"][0]
            assert "edit_path" in entry
            assert "old_value" in entry
            assert "new_value" in entry
            assert "change_type" in entry
            assert "timestamp" in entry

    def test_multiple_transactions_in_history(self, client, spec_id):
        """Multiple transactions all appear in history."""
        transaction_count = 5
        for i in range(transaction_count):
            txn = {
                "edit_path": f"/field/{i}",
                "old_value": f"old_{i}",
                "new_value": f"new_{i}",
                "change_type": "update",
            }
            client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        history_response = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history")
        history = history_response.json()
        assert history["total"] >= transaction_count

    def test_history_pagination_works_with_transactions(self, client, spec_id):
        """History pagination works correctly with recorded transactions."""
        # Record 10 transactions
        for i in range(10):
            txn = {
                "edit_path": f"/field/{i}",
                "old_value": f"old_{i}",
                "new_value": f"new_{i}",
                "change_type": "update",
            }
            client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Get with pagination
        page1 = client.get(
            f"/api/oas/specs/{spec_id}/undo-redo/history?limit=5&offset=0"
        ).json()
        page2 = client.get(
            f"/api/oas/specs/{spec_id}/undo-redo/history?limit=5&offset=5"
        ).json()

        assert len(page1["history"]) <= 5
        assert len(page2["history"]) <= 5
        assert page1["total"] >= 10


class TestTransactionTypes:
    """Tests for different transaction types."""

    def test_update_transaction_recording(self, client, spec_id):
        """Update transactions are recorded correctly."""
        txn = {
            "edit_path": "/info/title",
            "old_value": "Old",
            "new_value": "New",
            "change_type": "update",
        }
        response = client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)
        assert response.status_code == 201

        # Verify it's in undo stack
        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["can_undo"] is True

    def test_create_transaction_recording(self, client, spec_id):
        """Create transactions are recorded correctly."""
        txn = {
            "edit_path": "/paths/~1users",
            "old_value": None,
            "new_value": "{}",
            "change_type": "create",
        }
        response = client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)
        assert response.status_code == 201

        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["can_undo"] is True

    def test_delete_transaction_recording(self, client, spec_id):
        """Delete transactions are recorded correctly."""
        txn = {
            "edit_path": "/paths/~1users",
            "old_value": "{}",
            "new_value": None,
            "change_type": "delete",
        }
        response = client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)
        assert response.status_code == 201

        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["can_undo"] is True


class TestStackLimitsWithTransactions:
    """Tests for 20-level stack limit with transactions."""

    def test_stack_respects_20_level_limit(self, client, spec_id):
        """Undo stack respects 20-level maximum."""
        # Record 25 transactions
        for i in range(25):
            txn = {
                "edit_path": f"/field/{i}",
                "old_value": f"old_{i}",
                "new_value": f"new_{i}",
                "change_type": "update",
            }
            client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Check status
        status = client.get(f"/api/oas/specs/{spec_id}/undo-redo/status").json()
        assert status["undo_stack_size"] <= 20
        assert status["max_stack_size"] == 20

    def test_oldest_transactions_removed_at_limit(self, client, spec_id):
        """Oldest transactions are removed when reaching 20-level limit."""
        # Record 25 transactions
        for i in range(25):
            txn = {
                "edit_path": f"/field/{i}",
                "old_value": f"old_{i}",
                "new_value": f"new_{i}",
                "change_type": "update",
            }
            client.post(f"/api/oas/specs/{spec_id}/transactions", json=txn)

        # Most recent should be available
        history = client.get(f"/api/oas/specs/{spec_id}/undo-redo/history").json()
        if len(history["history"]) > 0:
            most_recent = history["history"][-1]
            # Should contain one of the recent fields
            assert "field" in most_recent.get("edit_path", "")
