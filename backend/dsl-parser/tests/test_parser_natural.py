"""
Unit tests for natural language field parsing in DSL Parser.

Tests for Feature 003 - Natural Language DSL syntax.
TDD: T004 - Tests written BEFORE implementation.

Natural language field syntax:
- field_name (type) - description
- field_name (type, required) - description
- field_name (type)
"""

import pytest
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from parser import Parser, parse
from dsl_ast import ModelNode, FieldNode


class TestNaturalLanguageFieldParsing:
    """Tests for parsing natural language field syntax."""

    def test_parse_simple_field(self):
        """Test parsing a simple field: - field (type)"""
        source = """## Model: User
- id (integer)"""
        result = parse(source)

        assert len(result.models) == 1
        model = result.models[0]
        assert len(model.fields) == 1

        field = model.fields[0]
        assert field.name == "id"
        assert field.field_type == "integer"
        assert field.required is False  # Default is optional

    def test_parse_required_field(self):
        """Test parsing required field: - field (type, required)"""
        source = """## Model: User
- id (integer, required)"""
        result = parse(source)

        assert len(result.models) == 1
        field = result.models[0].fields[0]
        assert field.name == "id"
        assert field.field_type == "integer"
        assert field.required is True

    def test_parse_field_with_description(self):
        """Test parsing field with description: - field (type) - description"""
        source = """## Model: User
- email (string) - The user's email address"""
        result = parse(source)

        assert len(result.models) == 1
        field = result.models[0].fields[0]
        assert field.name == "email"
        assert field.field_type == "string"
        assert field.description == "The user's email address"

    def test_parse_required_field_with_description(self):
        """Test parsing required field with description."""
        source = """## Model: User
- id (integer, required) - The unique identifier"""
        result = parse(source)

        field = result.models[0].fields[0]
        assert field.name == "id"
        assert field.field_type == "integer"
        assert field.required is True
        assert field.description == "The unique identifier"

    def test_parse_array_type(self):
        """Test parsing array type: - field (Type[])"""
        source = """## Model: User
- tags (string[])"""
        result = parse(source)

        field = result.models[0].fields[0]
        assert field.name == "tags"
        assert field.field_type == "string[]"
        # Parser should recognize this as an array

    def test_parse_model_reference(self):
        """Test parsing model reference: - field (ModelName)"""
        source = """## Model: User
- category (Category)"""
        result = parse(source)

        field = result.models[0].fields[0]
        assert field.name == "category"
        assert field.field_type == "Category"

    def test_parse_model_array_reference(self):
        """Test parsing array of model: - field (ModelName[])"""
        source = """## Model: Owner
- pets (Pet[])"""
        result = parse(source)

        field = result.models[0].fields[0]
        assert field.name == "pets"
        assert field.field_type == "Pet[]"

    def test_parse_multiple_fields(self):
        """Test parsing multiple fields in a model."""
        source = """## Model: User
A user in the system.

- id (integer, required) - The unique identifier
- name (string, required) - The user's name
- email (string) - Optional email address
- age (integer)"""
        result = parse(source)

        assert len(result.models) == 1
        model = result.models[0]
        assert len(model.fields) == 4

        # Check field order
        assert model.fields[0].name == "id"
        assert model.fields[1].name == "name"
        assert model.fields[2].name == "email"
        assert model.fields[3].name == "age"

        # Check required flags
        assert model.fields[0].required is True
        assert model.fields[1].required is True
        assert model.fields[2].required is False
        assert model.fields[3].required is False

    def test_parse_model_with_description_and_fields(self):
        """Test that model description is separate from field descriptions."""
        source = """## Model: Pet
A pet available in the store.

- id (integer, required) - Pet ID
- name (string, required) - Pet name"""
        result = parse(source)

        model = result.models[0]
        assert "pet available in the store" in model.description.lower()
        assert len(model.fields) == 2

    def test_parse_field_with_underscore_name(self):
        """Test parsing field with underscores in name."""
        source = """## Model: User
- created_at (datetime, required) - Creation timestamp
- updated_at (datetime)"""
        result = parse(source)

        assert result.models[0].fields[0].name == "created_at"
        assert result.models[0].fields[1].name == "updated_at"

    def test_parse_field_types(self):
        """Test parsing various field types."""
        source = """## Model: Example
- str_field (string)
- int_field (integer)
- num_field (number)
- bool_field (boolean)
- date_field (date)
- datetime_field (datetime)
- time_field (time)"""
        result = parse(source)

        fields = {f.name: f.field_type for f in result.models[0].fields}
        assert fields["str_field"] == "string"
        assert fields["int_field"] == "integer"
        assert fields["num_field"] == "number"
        assert fields["bool_field"] == "boolean"
        assert fields["date_field"] == "date"
        assert fields["datetime_field"] == "datetime"
        assert fields["time_field"] == "time"


class TestTableSyntaxMigration:
    """Tests for table syntax detection and migration errors."""

    def test_table_syntax_produces_no_fields(self):
        """Test that old table syntax doesn't produce fields (needs migration)."""
        source = """## Model: Pet
| name | type | required |
|------|------|----------|
| id | integer | true |"""
        result = parse(source)

        # Model should exist but have no fields (table syntax not supported)
        assert len(result.models) == 1
        assert len(result.models[0].fields) == 0

    def test_mixed_syntax_only_parses_natural(self):
        """Test that only natural language fields are parsed, not tables."""
        source = """## Model: Pet
A pet in the store.

- id (integer, required)

| old | table | syntax |
|-----|-------|--------|
| val | val   | val    |

- name (string, required)"""
        result = parse(source)

        # Should only have the two natural language fields
        assert len(result.models[0].fields) == 2
        field_names = [f.name for f in result.models[0].fields]
        assert "id" in field_names
        assert "name" in field_names


class TestComplexModelParsing:
    """Tests for complex model scenarios."""

    def test_parse_model_with_various_references(self):
        """Test model with primitive, array, and reference types."""
        source = """## Model: Order
An order in the system.

- id (integer, required) - Order ID
- items (OrderItem[], required) - Items in the order
- customer (Customer, required) - Customer who placed the order
- notes (string) - Optional notes
- tags (string[]) - Tags for categorization"""
        result = parse(source)

        model = result.models[0]
        assert len(model.fields) == 5

        # Verify types
        fields = {f.name: f for f in model.fields}
        assert fields["id"].field_type == "integer"
        assert fields["items"].field_type == "OrderItem[]"
        assert fields["customer"].field_type == "Customer"
        assert fields["notes"].field_type == "string"
        assert fields["tags"].field_type == "string[]"

    def test_parse_multiple_models(self):
        """Test parsing multiple models with natural language syntax."""
        source = """## Model: Pet
A pet in the store.

- id (integer, required)
- name (string, required)
- category (Category)

## Model: Category
A category for pets.

- id (integer, required)
- name (string, required)"""
        result = parse(source)

        assert len(result.models) == 2

        pet = next(m for m in result.models if m.name == "Pet")
        category = next(m for m in result.models if m.name == "Category")

        assert len(pet.fields) == 3
        assert len(category.fields) == 2

    def test_parse_full_spec_with_natural_syntax(self):
        """Test parsing a complete spec with natural language syntax."""
        source = """# Service: PetStore
version: 1.0.0
base_path: /api/v1

A sample pet store API.

## Model: Pet
A pet in the store.

- id (integer, required) - Unique pet ID
- name (string, required) - Pet name
- status (string) - available, pending, or sold

## Model: Category
A category for organizing pets.

- id (integer, required)
- name (string, required)

## Operation: GET /pets
List all pets.

**Response**: Pet[]

## Operation: GET /pets/{petId}
Get a specific pet.

**Response**: Pet

## Error: 404 NotFound
Pet not found."""
        result = parse(source)

        assert len(result.services) == 1
        assert len(result.models) == 2
        assert len(result.operations) == 2
        assert len(result.errors) == 1

        # Verify Pet model fields
        pet = next(m for m in result.models if m.name == "Pet")
        assert len(pet.fields) == 3
        assert pet.fields[0].name == "id"
        assert pet.fields[0].required is True
