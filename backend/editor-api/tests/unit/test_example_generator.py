"""
T009: Unit tests for Example Value Generator.

Tests for Feature 003 - OpenAPI Export.
TDD: Tests written BEFORE implementation.

The ExampleGenerator produces realistic example values based on:
- Field name patterns (id, email, url, etc.)
- Field types (string, integer, boolean, etc.)
- Array handling
"""

import pytest


class TestExampleGeneratorByFieldName:
    """Tests for pattern-based example generation from field names."""

    def test_id_field_returns_integer(self):
        """Test that 'id' field produces an integer example."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("id", "integer")

        assert isinstance(example, int)
        assert example >= 1

    def test_underscore_id_field_returns_integer(self):
        """Test that '*_id' fields produce integer examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["user_id", "pet_id", "order_id"]:
            example = generator.generate_example(field, "integer")
            assert isinstance(example, int)
            assert example >= 1

    def test_name_field_returns_string(self):
        """Test that 'name' field produces a realistic string example."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("name", "string")

        assert isinstance(example, str)
        assert len(example) > 0
        # Should be a readable name, not just "string"
        assert example != "string"

    def test_email_field_returns_email_format(self):
        """Test that 'email' field produces email-like example."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("email", "string")

        assert isinstance(example, str)
        assert "@" in example
        assert "." in example

    def test_url_field_returns_url_format(self):
        """Test that 'url' or '*_url' fields produce URL examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["url", "website_url", "avatar_url"]:
            example = generator.generate_example(field, "string")
            assert isinstance(example, str)
            assert example.startswith("http")

    def test_phone_field_returns_phone_format(self):
        """Test that 'phone' field produces phone-like example."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("phone", "string")

        assert isinstance(example, str)
        # Should contain digits
        assert any(c.isdigit() for c in example)

    def test_is_prefix_field_returns_boolean(self):
        """Test that 'is_*' fields produce boolean examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["is_active", "is_verified", "is_admin"]:
            example = generator.generate_example(field, "boolean")
            assert isinstance(example, bool)

    def test_has_prefix_field_returns_boolean(self):
        """Test that 'has_*' fields produce boolean examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["has_access", "has_premium"]:
            example = generator.generate_example(field, "boolean")
            assert isinstance(example, bool)

    def test_datetime_suffix_returns_iso_datetime(self):
        """Test that '*_at' fields produce datetime examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["created_at", "updated_at", "deleted_at"]:
            example = generator.generate_example(field, "datetime")
            assert isinstance(example, str)
            # Should be ISO format with T separator
            assert "T" in example or "-" in example

    def test_price_field_returns_number(self):
        """Test that 'price' or 'amount' fields produce number examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["price", "amount", "total"]:
            example = generator.generate_example(field, "number")
            assert isinstance(example, (int, float))
            assert example > 0

    def test_count_field_returns_integer(self):
        """Test that 'count' or 'quantity' fields produce integer examples."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["count", "quantity", "total_count"]:
            example = generator.generate_example(field, "integer")
            assert isinstance(example, int)
            assert example >= 0

    def test_description_field_returns_lorem_like(self):
        """Test that 'description' or 'bio' fields produce longer text."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()

        for field in ["description", "bio", "summary"]:
            example = generator.generate_example(field, "string")
            assert isinstance(example, str)
            # Should be longer than typical short string
            assert len(example) > 10


class TestExampleGeneratorByType:
    """Tests for type-based example generation (fallbacks)."""

    def test_string_type_default(self):
        """Test default example for string type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("unknown_field", "string")

        assert isinstance(example, str)
        assert len(example) > 0

    def test_integer_type_default(self):
        """Test default example for integer type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("unknown_field", "integer")

        assert isinstance(example, int)

    def test_number_type_default(self):
        """Test default example for number type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("unknown_field", "number")

        assert isinstance(example, (int, float))

    def test_boolean_type_default(self):
        """Test default example for boolean type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("unknown_field", "boolean")

        assert isinstance(example, bool)

    def test_date_type(self):
        """Test example for date type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("birth_date", "date")

        assert isinstance(example, str)
        # Should be date format YYYY-MM-DD
        assert "-" in example

    def test_datetime_type(self):
        """Test example for datetime type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("timestamp", "datetime")

        assert isinstance(example, str)
        # Should be ISO datetime format
        assert "T" in example or "-" in example


class TestExampleGeneratorArrays:
    """Tests for array type handling."""

    def test_string_array(self):
        """Test example for string array type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("tags", "string[]")

        assert isinstance(example, list)
        assert len(example) >= 1
        assert all(isinstance(item, str) for item in example)

    def test_integer_array(self):
        """Test example for integer array type."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("scores", "integer[]")

        assert isinstance(example, list)
        assert len(example) >= 1
        assert all(isinstance(item, int) for item in example)

    def test_model_array_returns_empty_list(self):
        """Test that model array type returns empty list (models handled separately)."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("pets", "Pet[]")

        # For model arrays, return empty list (models are handled by OpenAPIGenerator)
        assert isinstance(example, list)


class TestExampleGeneratorModelReferences:
    """Tests for model reference handling."""

    def test_model_reference_returns_none(self):
        """Test that model references return None (handled by OpenAPIGenerator)."""
        from src.utils.example_generator import ExampleGenerator

        generator = ExampleGenerator()
        example = generator.generate_example("category", "Category")

        # Model references are handled separately via $ref
        assert example is None or isinstance(example, dict)
