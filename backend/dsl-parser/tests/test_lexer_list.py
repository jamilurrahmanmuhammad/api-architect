"""
Unit tests for LIST_ITEM token recognition in DSL Lexer.

Tests for Feature 003 - Natural Language DSL syntax.
TDD: T001 - Tests written BEFORE implementation.

List item syntax:
- field_name (type) - description
- field_name (type, required) - description
- field_name (type)
"""

import pytest
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from lexer import Lexer, Token, TokenType


class TestListItemToken:
    """Tests for LIST_ITEM token recognition."""

    def test_simple_list_item(self):
        """Test tokenizing simple list item: - field (type)"""
        lexer = Lexer("- id (integer)")
        tokens = lexer.tokenize()

        # Should produce a LIST_ITEM token
        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert list_items[0].line == 1

    def test_list_item_with_required(self):
        """Test tokenizing list item with required: - field (type, required)"""
        lexer = Lexer("- name (string, required)")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        # Token value should contain the full list item content
        assert "name" in list_items[0].value
        assert "string" in list_items[0].value
        assert "required" in list_items[0].value

    def test_list_item_with_description(self):
        """Test tokenizing list item with description: - field (type) - description"""
        lexer = Lexer("- email (string) - The user's email address")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert "email" in list_items[0].value
        assert "string" in list_items[0].value

    def test_list_item_required_with_description(self):
        """Test tokenizing list item with required and description."""
        lexer = Lexer("- id (integer, required) - The unique identifier")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        token_value = list_items[0].value
        assert "id" in token_value
        assert "integer" in token_value
        assert "required" in token_value

    def test_list_item_array_type(self):
        """Test tokenizing list item with array type: - field (Type[])"""
        lexer = Lexer("- tags (string[])")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert "tags" in list_items[0].value
        assert "string[]" in list_items[0].value

    def test_list_item_model_reference(self):
        """Test tokenizing list item with model reference: - field (ModelName)"""
        lexer = Lexer("- category (Category)")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert "category" in list_items[0].value
        assert "Category" in list_items[0].value

    def test_list_item_model_array_reference(self):
        """Test tokenizing list item with array of model: - field (ModelName[])"""
        lexer = Lexer("- pets (Pet[])")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert "pets" in list_items[0].value
        assert "Pet[]" in list_items[0].value

    def test_multiple_list_items(self):
        """Test tokenizing multiple list items in sequence."""
        dsl = """- id (integer, required) - Unique ID
- name (string, required) - User name
- email (string) - Email address"""
        lexer = Lexer(dsl)
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 3

        # Check line numbers
        assert list_items[0].line == 1
        assert list_items[1].line == 2
        assert list_items[2].line == 3

    def test_list_item_in_model_context(self):
        """Test list items within a model definition."""
        dsl = """## Model: User
A user in the system.

- id (integer, required) - The unique identifier
- name (string, required) - The user's name
- email (string) - Optional email"""
        lexer = Lexer(dsl)
        tokens = lexer.tokenize()

        # Should have H2, MODEL, identifier, text, and LIST_ITEMs
        assert any(t.type == TokenType.H2 for t in tokens)
        assert any(t.type == TokenType.MODEL for t in tokens)

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 3

    def test_list_item_with_spaces_in_description(self):
        """Test list item with multi-word description."""
        lexer = Lexer("- bio (string) - A short biography about the user")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1

    def test_list_item_column_position(self):
        """Test that list item tokens have correct column positions."""
        lexer = Lexer("- field (type)")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        # Should start at column 1 (or 0 depending on implementation)
        assert list_items[0].column in (0, 1)

    def test_non_list_item_dash(self):
        """Test that dashes not at line start don't produce LIST_ITEM."""
        lexer = Lexer("This is some text - with a dash")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 0

    def test_list_item_underscore_in_field_name(self):
        """Test list item with underscores in field name."""
        lexer = Lexer("- created_at (datetime, required) - Creation timestamp")
        tokens = lexer.tokenize()

        list_items = [t for t in tokens if t.type == TokenType.LIST_ITEM]
        assert len(list_items) == 1
        assert "created_at" in list_items[0].value


class TestTableSyntaxMigration:
    """Tests for table syntax detection and migration errors."""

    def test_table_row_produces_error_token(self):
        """Test that table rows produce an error or special token for migration."""
        lexer = Lexer("| name | type | required |")
        tokens = lexer.tokenize()

        # Should NOT produce TABLE_SEPARATOR anymore
        # Should produce some indication that this is deprecated syntax
        # Either an UNKNOWN token or a special DEPRECATED_TABLE token
        assert not any(t.type == TokenType.TABLE_SEPARATOR for t in tokens)

    def test_table_separator_produces_error_token(self):
        """Test that table separators are flagged for migration."""
        lexer = Lexer("|------|------|----------|")
        tokens = lexer.tokenize()

        # Should NOT produce TABLE_SEPARATOR
        assert not any(t.type == TokenType.TABLE_SEPARATOR for t in tokens)
