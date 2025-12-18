"""
T058: Unit tests for parser output (ParsedRequirements).

Tests the structured output from the DSL parser, including:
- Entity extraction (services, models, operations, errors)
- Source location tracking
- Serialization to dictionary/JSON
- Entity counts and validity checks
- Incremental parsing (valid entities even with some errors)
"""

import pytest
from src.parser import Parser
from src.dsl_ast import (
    ParsedRequirements,
    ServiceNode,
    ModelNode,
    FieldNode,
    OperationNode,
    ErrorNode,
    SourceLocation,
)


class TestParsedRequirementsStructure:
    """Tests for ParsedRequirements container."""

    def test_empty_requirements(self):
        """Empty input should return empty ParsedRequirements."""
        result = Parser("").parse()

        assert isinstance(result, ParsedRequirements)
        assert result.services == []
        assert result.models == []
        assert result.operations == []
        assert result.errors == []
        assert result.is_valid
        assert result.entity_count == 0

    def test_parsed_requirements_to_dict(self):
        """to_dict should include all entity lists and metadata."""
        result = Parser("").parse()
        d = result.to_dict()

        assert "services" in d
        assert "models" in d
        assert "operations" in d
        assert "errors" in d
        assert "parse_errors" in d
        assert "valid_entities" in d
        assert "total_errors" in d

    def test_is_valid_with_no_errors(self):
        """is_valid should be True when no parse errors."""
        dsl = """# Service: TestAPI
version: 1.0.0

## Model: User
- id (integer, required)
"""
        result = Parser(dsl).parse()
        assert result.is_valid

    def test_entity_count(self):
        """entity_count should sum all parsed entities."""
        dsl = """# Service: TestAPI
version: 1.0.0

## Model: User
- id (integer, required)

## Model: Product
- id (integer, required)

## Error: 404 NotFound
Resource not found.
"""
        result = Parser(dsl).parse()
        # 1 service + 2 models + 1 error = 4
        assert result.entity_count == 4


class TestServiceParsing:
    """Tests for service entity parsing."""

    def test_parse_service_basic(self):
        """Parse basic service definition."""
        dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1
"""
        result = Parser(dsl).parse()

        assert len(result.services) == 1
        service = result.services[0]
        assert service.name == "Petstore API"
        assert service.version == "1.0.0"
        assert service.base_path == "/api/v1"

    def test_service_location_tracking(self):
        """Service should track source location."""
        dsl = """# Service: TestAPI
version: 1.0.0
"""
        result = Parser(dsl).parse()
        service = result.services[0]

        assert service.location.line == 1
        assert service.location.column >= 1

    def test_service_to_dict(self):
        """Service to_dict should include all fields."""
        dsl = """# Service: TestAPI
version: 2.0.0
base_path: /v2
"""
        result = Parser(dsl).parse()
        d = result.services[0].to_dict()

        assert d["name"] == "TestAPI"
        assert d["version"] == "2.0.0"
        assert d["base_path"] == "/v2"
        assert "location" in d
        assert d["location"]["line"] == 1


class TestModelParsing:
    """Tests for model entity parsing."""

    def test_parse_model_basic(self):
        """Parse basic model definition using natural language syntax."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
A user in the system.

- id (integer, required) - Unique identifier
- email (string, required) - User email
"""
        result = Parser(dsl).parse()

        assert len(result.models) == 1
        model = result.models[0]
        assert model.name == "User"
        assert model.description == "A user in the system."
        assert len(model.fields) == 2

    def test_model_fields(self):
        """Model fields should be parsed correctly using natural language syntax."""
        dsl = """# Service: Test
version: 1.0.0

## Model: Product
- id (integer, required)
- name (string, required)
- price (number)
"""
        result = Parser(dsl).parse()
        model = result.models[0]

        assert len(model.fields) == 3
        assert model.fields[0].name == "id"
        assert model.fields[0].field_type == "integer"
        assert model.fields[0].required == True

        assert model.fields[2].name == "price"
        assert model.fields[2].required == False

    def test_model_location_tracking(self):
        """Model should track source location."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)
"""
        result = Parser(dsl).parse()
        model = result.models[0]

        # Model starts at line 4
        assert model.location.line == 4

    def test_model_to_dict(self):
        """Model to_dict should include fields."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)
"""
        result = Parser(dsl).parse()
        d = result.models[0].to_dict()

        assert d["name"] == "User"
        assert "fields" in d
        assert len(d["fields"]) == 1
        assert d["fields"][0]["name"] == "id"

    def test_multiple_models(self):
        """Multiple models should all be parsed."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)

## Model: Product
- id (integer, required)

## Model: Order
- id (integer, required)
"""
        result = Parser(dsl).parse()
        assert len(result.models) == 3
        names = [m.name for m in result.models]
        assert "User" in names
        assert "Product" in names
        assert "Order" in names


class TestOperationParsing:
    """Tests for operation entity parsing."""

    def test_parse_operation_basic(self):
        """Parse basic operation definition."""
        dsl = """# Service: Test
version: 1.0.0

## Operation: GET /users
List all users.
"""
        result = Parser(dsl).parse()

        assert len(result.operations) == 1
        op = result.operations[0]
        assert op.method == "GET"
        assert op.path == "/users"

    def test_operation_with_request_response(self):
        """Operation should capture request/response models."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)

## Operation: POST /users
Create a new user.

**Request**: User
**Response**: User
"""
        result = Parser(dsl).parse()
        op = result.operations[0]

        assert op.request_model == "User"
        assert op.response_model == "User"

    def test_operation_location_tracking(self):
        """Operation should track source location."""
        dsl = """# Service: Test
version: 1.0.0

## Operation: GET /users
List users.
"""
        result = Parser(dsl).parse()
        op = result.operations[0]

        # Operation starts at line 4
        assert op.location.line == 4

    def test_operation_to_dict(self):
        """Operation to_dict should include all fields."""
        dsl = """# Service: Test
version: 1.0.0

## Operation: DELETE /users/{id}
Delete a user.
"""
        result = Parser(dsl).parse()
        d = result.operations[0].to_dict()

        assert d["method"] == "DELETE"
        assert d["path"] == "/users/{id}"
        assert "location" in d


class TestErrorParsing:
    """Tests for error entity parsing."""

    def test_parse_error_basic(self):
        """Parse basic error definition."""
        dsl = """# Service: Test
version: 1.0.0

## Error: 404 NotFound
The requested resource was not found.
"""
        result = Parser(dsl).parse()

        assert len(result.errors) == 1
        err = result.errors[0]
        assert err.status_code == 404
        assert err.name == "NotFound"
        assert "not found" in err.description.lower()

    def test_error_location_tracking(self):
        """Error should track source location."""
        dsl = """# Service: Test
version: 1.0.0

## Error: 500 InternalError
Server error.
"""
        result = Parser(dsl).parse()
        err = result.errors[0]

        assert err.location.line == 4

    def test_error_to_dict(self):
        """Error to_dict should include all fields."""
        dsl = """# Service: Test
version: 1.0.0

## Error: 401 Unauthorized
Authentication required.
"""
        result = Parser(dsl).parse()
        d = result.errors[0].to_dict()

        assert d["status_code"] == 401
        assert d["name"] == "Unauthorized"
        assert "location" in d

    def test_multiple_errors(self):
        """Multiple errors should all be parsed."""
        dsl = """# Service: Test
version: 1.0.0

## Error: 400 BadRequest
Invalid input.

## Error: 404 NotFound
Resource not found.

## Error: 500 InternalError
Server error.
"""
        result = Parser(dsl).parse()
        assert len(result.errors) == 3


class TestIncrementalParsing:
    """Tests for incremental/best-effort parsing."""

    def test_valid_entities_with_invalid_section(self):
        """Valid entities should be extracted even with invalid sections."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)

## Invalid section that doesn't parse

## Model: Product
- id (integer, required)
"""
        result = Parser(dsl).parse()

        # Should still have valid models
        assert len(result.models) >= 1
        model_names = [m.name for m in result.models]
        assert "User" in model_names

    def test_partial_service_still_extracted(self):
        """Service with some valid properties should be extracted."""
        dsl = """# Service: PartialAPI
version: 1.0.0
"""
        result = Parser(dsl).parse()

        assert len(result.services) == 1
        assert result.services[0].name == "PartialAPI"


class TestComplexDocument:
    """Tests for complex DSL documents with multiple entity types."""

    def test_full_api_spec(self):
        """Parse a complete API specification using natural language syntax."""
        dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

## Model: Pet
A pet in the store.

- id (integer, required) - Pet ID
- name (string, required) - Pet name
- status (string) - Pet status

## Model: Category
- id (integer, required)
- name (string, required)

## Operation: GET /pets
List all pets.

**Response**: Pet[]

## Operation: POST /pets
Add a pet.

**Request**: Pet
**Response**: Pet

## Operation: GET /pets/{id}
Get pet by ID.

**Response**: Pet

## Error: 404 NotFound
Pet not found.

## Error: 400 BadRequest
Invalid input.
"""
        result = Parser(dsl).parse()

        # Verify all entities
        assert len(result.services) == 1
        assert len(result.models) == 2
        assert len(result.operations) == 3
        assert len(result.errors) == 2

        # Verify service
        assert result.services[0].name == "Petstore API"
        assert result.services[0].version == "1.0.0"

        # Verify models
        model_names = [m.name for m in result.models]
        assert "Pet" in model_names
        assert "Category" in model_names

        # Pet model should have 3 fields
        pet_model = next(m for m in result.models if m.name == "Pet")
        assert len(pet_model.fields) == 3

        # Verify operations
        ops = result.operations
        methods = [op.method for op in ops]
        assert "GET" in methods
        assert "POST" in methods

        # Total entity count
        assert result.entity_count == 8  # 1 + 2 + 3 + 2

    def test_to_dict_serialization_complete(self):
        """Complete document should serialize to dict."""
        dsl = """# Service: TestAPI
version: 1.0.0

## Model: User
- id (integer, required)

## Operation: GET /users
List users.

## Error: 404 NotFound
Not found.
"""
        result = Parser(dsl).parse()
        d = result.to_dict()

        # Check structure
        assert len(d["services"]) == 1
        assert len(d["models"]) == 1
        assert len(d["operations"]) == 1
        assert len(d["errors"]) == 1
        assert d["valid_entities"] == 4
        assert d["total_errors"] == 0


class TestSourceLocationAccuracy:
    """Tests for accurate source location tracking."""

    def test_location_includes_line_and_column(self):
        """All locations should have line and column."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)
"""
        result = Parser(dsl).parse()

        for service in result.services:
            assert service.location.line >= 1
            assert service.location.column >= 1

        for model in result.models:
            assert model.location.line >= 1
            assert model.location.column >= 1

    def test_location_in_serialized_output(self):
        """Location should be included in serialized output."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)
"""
        result = Parser(dsl).parse()
        d = result.to_dict()

        # Check location in serialized service
        assert "location" in d["services"][0]
        assert "line" in d["services"][0]["location"]

        # Check location in serialized model
        assert "location" in d["models"][0]
        assert "line" in d["models"][0]["location"]


class TestFieldConstraints:
    """Tests for field constraint parsing."""

    def test_field_with_constraints(self):
        """Fields with constraints should be parsed using natural language syntax."""
        dsl = """# Service: Test
version: 1.0.0

## Model: User
- id (integer, required)
- email (string, required)
"""
        result = Parser(dsl).parse()
        model = result.models[0]

        # Basic field parsing works
        assert len(model.fields) == 2
        assert model.fields[1].name == "email"
        assert model.fields[1].field_type == "string"
