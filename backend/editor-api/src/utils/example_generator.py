"""
Example Value Generator for OpenAPI Export.

Generates realistic example values based on field names and types.
Uses pattern matching for semantic field names (email, url, id, etc.)
with type-based fallbacks.

Feature 003 - Natural Language DSL & OpenAPI Export.
"""

import re
from typing import Any, Optional


class ExampleGenerator:
    """
    Generates realistic example values for OpenAPI schema properties.

    Example values are generated based on:
    1. Field name patterns (highest priority)
    2. Field types (fallback)
    """

    # Field name patterns -> example values
    NAME_PATTERNS = {
        # ID fields
        r"^id$": lambda: 1,
        r"_id$": lambda: 42,

        # Name fields
        r"^name$": lambda: "John Doe",
        r"^first_?name$": lambda: "John",
        r"^last_?name$": lambda: "Doe",
        r"^full_?name$": lambda: "John Doe",
        r"^user_?name$": lambda: "johndoe",

        # Contact fields
        r"email": lambda: "user@example.com",
        r"phone": lambda: "+1-555-0123",

        # URL fields
        r"url$": lambda: "https://example.com",
        r"^url$": lambda: "https://example.com",
        r"_url$": lambda: "https://example.com/resource",
        r"^website$": lambda: "https://example.com",
        r"^avatar$": lambda: "https://example.com/avatar.jpg",
        r"^image$": lambda: "https://example.com/image.jpg",

        # Boolean fields
        r"^is_": lambda: True,
        r"^has_": lambda: True,
        r"^can_": lambda: True,
        r"^active$": lambda: True,
        r"^enabled$": lambda: True,
        r"^verified$": lambda: True,

        # Datetime fields
        r"_at$": lambda: "2025-01-15T10:30:00Z",
        r"^created$": lambda: "2025-01-15T10:30:00Z",
        r"^updated$": lambda: "2025-01-15T10:30:00Z",
        r"^timestamp$": lambda: "2025-01-15T10:30:00Z",

        # Date fields
        r"_date$": lambda: "2025-01-15",
        r"^birth_?date$": lambda: "1990-01-15",
        r"^date$": lambda: "2025-01-15",

        # Money fields
        r"^price$": lambda: 29.99,
        r"^amount$": lambda: 99.99,
        r"^total$": lambda: 149.99,
        r"^cost$": lambda: 49.99,

        # Count fields
        r"^count$": lambda: 5,
        r"^quantity$": lambda: 3,
        r"_count$": lambda: 10,
        r"^size$": lambda: 100,

        # Text fields
        r"^description$": lambda: "A detailed description of the item.",
        r"^bio$": lambda: "A brief biography about the person.",
        r"^summary$": lambda: "A concise summary of the content.",
        r"^title$": lambda: "Item Title",
        r"^content$": lambda: "This is the main content of the item.",
        r"^comment$": lambda: "This is a user comment.",

        # Status fields
        r"^status$": lambda: "active",
        r"^state$": lambda: "pending",

        # Tag/category fields
        r"^tags$": lambda: ["tag1", "tag2"],
        r"^category$": lambda: "general",
        r"^type$": lambda: "default",

        # Address fields
        r"^address$": lambda: "123 Main Street",
        r"^city$": lambda: "New York",
        r"^country$": lambda: "United States",
        r"^zip$": lambda: "10001",
        r"^postal_?code$": lambda: "10001",

        # Version
        r"^version$": lambda: "1.0.0",
    }

    # Type -> default example value
    TYPE_DEFAULTS = {
        "string": "string",
        "integer": 0,
        "number": 0.0,
        "boolean": False,
        "date": "2025-01-15",
        "datetime": "2025-01-15T10:30:00Z",
        "time": "10:30:00",
        "object": {},
        "array": [],
    }

    def __init__(self):
        """Initialize the example generator."""
        # Compile patterns for efficiency
        self._compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE), factory)
            for pattern, factory in self.NAME_PATTERNS.items()
        ]

    def generate_example(self, field_name: str, field_type: str) -> Any:
        """
        Generate an example value for a field.

        Args:
            field_name: Name of the field (e.g., "email", "user_id")
            field_type: Type of the field (e.g., "string", "integer", "string[]")

        Returns:
            An appropriate example value for the field
        """
        # Handle array types
        if field_type.endswith("[]"):
            return self._generate_array_example(field_name, field_type)

        # Handle model references (PascalCase types)
        if self._is_model_reference(field_type):
            return None  # Model references use $ref in OpenAPI

        # Try pattern-based generation first
        example = self._match_pattern(field_name, field_type)
        if example is not None:
            return example

        # Fall back to type-based default
        return self._get_type_default(field_type)

    def _match_pattern(self, field_name: str, field_type: str) -> Optional[Any]:
        """Match field name against known patterns."""
        for pattern, factory in self._compiled_patterns:
            if pattern.search(field_name):
                value = factory()
                # Ensure the value matches the expected type
                return self._coerce_to_type(value, field_type)
        return None

    def _coerce_to_type(self, value: Any, field_type: str) -> Any:
        """Coerce a value to match the expected type."""
        if field_type == "integer":
            if isinstance(value, bool):
                return 1 if value else 0
            if isinstance(value, (int, float)):
                return int(value)
            return 0
        elif field_type == "number":
            if isinstance(value, bool):
                return 1.0 if value else 0.0
            if isinstance(value, (int, float)):
                return float(value)
            return 0.0
        elif field_type == "boolean":
            return bool(value)
        elif field_type == "string":
            if isinstance(value, str):
                return value
            return str(value)
        elif field_type in ("date", "datetime", "time"):
            if isinstance(value, str):
                return value
            return self.TYPE_DEFAULTS.get(field_type, "2025-01-15")
        return value

    def _get_type_default(self, field_type: str) -> Any:
        """Get default example value for a type."""
        return self.TYPE_DEFAULTS.get(field_type, "string")

    def _generate_array_example(self, field_name: str, field_type: str) -> list:
        """Generate an example array value."""
        # Extract element type
        element_type = field_type[:-2]  # Remove "[]"

        # Model arrays return empty list (models use $ref)
        if self._is_model_reference(element_type):
            return []

        # Generate 2 example elements
        examples = []
        for _ in range(2):
            example = self.generate_example(field_name, element_type)
            if example is not None:
                examples.append(example)

        # Ensure at least one element
        if not examples:
            examples = [self._get_type_default(element_type)]

        return examples

    def _is_model_reference(self, field_type: str) -> bool:
        """Check if type is a model reference (PascalCase, not primitive)."""
        primitives = {
            "string", "integer", "number", "boolean",
            "date", "datetime", "time", "object", "array"
        }
        return field_type not in primitives and field_type[0].isupper()

    def generate_model_example(self, fields: list[dict]) -> dict:
        """
        Generate a complete example object for a model.

        Args:
            fields: List of field definitions with name, type, description

        Returns:
            Dictionary with example values for all fields
        """
        example = {}
        for field in fields:
            name = field.get("name", "field")
            field_type = field.get("type", "string")
            value = self.generate_example(name, field_type)
            if value is not None:
                example[name] = value
        return example
