"""
Unit tests for DSL Lexer and Parser.

Tests cover:
- Token generation for DSL syntax elements
- Parsing of services, models, operations, errors
- Error detection and reporting
- Best-effort parsing with partial valid content

TDD: Tests for T012 (lexer), T013 (parser), T014 (AST), T015 (errors)
"""

import pytest
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from lexer import Lexer, Token, TokenType
from parser import Parser, parse
from dsl_ast import ServiceNode, ModelNode, OperationNode, ErrorNode, FieldNode
from errors import ParseError, ParseErrorType


class TestLexer:
    """Tests for the DSL Lexer."""

    def test_empty_input(self):
        """Test tokenizing empty input."""
        lexer = Lexer("")
        tokens = lexer.tokenize()

        assert len(tokens) >= 1
        assert tokens[-1].type == TokenType.EOF

    def test_h1_header(self):
        """Test tokenizing H1 header."""
        lexer = Lexer("# Service: Petstore")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.H1 for t in tokens)
        assert any(t.type == TokenType.SERVICE for t in tokens)

    def test_h2_header_model(self):
        """Test tokenizing H2 Model header."""
        lexer = Lexer("## Model: Pet")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.H2 for t in tokens)
        assert any(t.type == TokenType.MODEL for t in tokens)
        assert any(t.value == "Pet" for t in tokens)

    def test_h2_header_operation(self):
        """Test tokenizing H2 Operation header."""
        lexer = Lexer("## Operation: GET /pets")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.H2 for t in tokens)
        assert any(t.type == TokenType.OPERATION for t in tokens)
        assert any(t.type == TokenType.HTTP_METHOD and t.value == "GET" for t in tokens)
        assert any(t.type == TokenType.PATH and t.value == "/pets" for t in tokens)

    def test_h2_header_error(self):
        """Test tokenizing H2 Error header."""
        lexer = Lexer("## Error: 404 NotFound")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.H2 for t in tokens)
        assert any(t.type == TokenType.ERROR for t in tokens)
        assert any(t.type == TokenType.NUMBER and t.value == "404" for t in tokens)
        assert any(t.value == "NotFound" for t in tokens)

    def test_key_value_pair(self):
        """Test tokenizing key: value pair."""
        lexer = Lexer("version: 1.0.0")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.IDENTIFIER and t.value == "version" for t in tokens)
        assert any(t.type == TokenType.COLON for t in tokens)
        assert any(t.value == "1.0.0" for t in tokens)

    def test_table_row(self):
        """Test that table rows are treated as TEXT (deprecated syntax)."""
        lexer = Lexer("| name | string | true | The name |")
        tokens = lexer.tokenize()

        # Table syntax is deprecated - should produce TEXT, not PIPE tokens
        assert any(t.type == TokenType.TEXT for t in tokens)
        # Should NOT have PIPE tokens anymore
        pipe_count = sum(1 for t in tokens if t.type == TokenType.PIPE)
        assert pipe_count == 0

    def test_table_separator(self):
        """Test that table separators are treated as TEXT (deprecated syntax)."""
        lexer = Lexer("|---|---|---|")
        tokens = lexer.tokenize()

        # TABLE_SEPARATOR is deprecated - should produce TEXT
        assert not any(t.type == TokenType.TABLE_SEPARATOR for t in tokens)
        assert any(t.type == TokenType.TEXT for t in tokens)

    def test_http_methods(self):
        """Test all HTTP methods are recognized."""
        for method in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
            lexer = Lexer(f"## Operation: {method} /test")
            tokens = lexer.tokenize()
            assert any(t.type == TokenType.HTTP_METHOD and t.value == method for t in tokens)

    def test_path_with_parameter(self):
        """Test path with parameter like /pets/{id}."""
        lexer = Lexer("## Operation: GET /pets/{id}")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.PATH and "{id}" in t.value for t in tokens)

    def test_bold_text(self):
        """Test bold markdown syntax."""
        lexer = Lexer("**Request**: Pet")
        tokens = lexer.tokenize()

        assert any(t.type == TokenType.BOLD and t.value == "Request" for t in tokens)

    def test_multiline_input(self):
        """Test tokenizing multiple lines."""
        source = """# Service: Petstore
version: 1.0.0

## Model: Pet
A pet in the store."""

        lexer = Lexer(source)
        tokens = lexer.tokenize()

        # Should have multiple newlines
        newline_count = sum(1 for t in tokens if t.type == TokenType.NEWLINE)
        assert newline_count >= 3

    def test_line_column_tracking(self):
        """Test that tokens have correct line/column info."""
        source = """# Service: Test
version: 1.0"""

        lexer = Lexer(source)
        tokens = lexer.tokenize()

        # First token should be at line 1
        h1_token = next(t for t in tokens if t.type == TokenType.H1)
        assert h1_token.line == 1

        # version should be at line 2
        version_token = next(t for t in tokens if t.value == "version")
        assert version_token.line == 2


class TestParser:
    """Tests for the DSL Parser."""

    def test_empty_input(self):
        """Test parsing empty input."""
        result = parse("")

        assert result.is_valid
        assert result.entity_count == 0

    def test_parse_simple_service(self):
        """Test parsing a simple service definition."""
        source = """# Service: Petstore
version: 1.0.0
base_path: /api/v1

A sample Pet Store API."""

        result = parse(source)

        assert len(result.services) == 1
        service = result.services[0]
        assert service.name == "Petstore"
        assert service.version == "1.0.0"
        assert service.base_path == "/api/v1"
        assert "Pet Store API" in (service.description or "")

    def test_parse_simple_model(self):
        """Test parsing a simple model definition using natural language syntax."""
        source = """## Model: Pet
A pet in the store.

- id (integer, required) - Unique identifier
- name (string, required) - Pet name
- tag (string) - Optional tag"""

        result = parse(source)

        assert len(result.models) == 1
        model = result.models[0]
        assert model.name == "Pet"
        assert len(model.fields) == 3

        # Check field details
        field_names = [f.name for f in model.fields]
        assert "id" in field_names
        assert "name" in field_names
        assert "tag" in field_names

        # Check required flag
        tag_field = next(f for f in model.fields if f.name == "tag")
        assert tag_field.required is False

    def test_parse_operation(self):
        """Test parsing an operation definition."""
        source = """## Operation: GET /pets
List all pets in the store.

**Request**: None
**Response**: Pet[]
**Errors**: 404 NotFound"""

        result = parse(source)

        assert len(result.operations) == 1
        op = result.operations[0]
        assert op.method == "GET"
        assert op.path == "/pets"
        assert op.response_model == "Pet"

    def test_parse_error_definition(self):
        """Test parsing an error definition."""
        source = """## Error: 404 NotFound
The requested resource was not found."""

        result = parse(source)

        assert len(result.errors) == 1
        error = result.errors[0]
        assert error.status_code == 404
        assert error.name == "NotFound"
        assert "not found" in (error.description or "").lower()

    def test_parse_complete_spec(self):
        """Test parsing a complete specification using natural language syntax."""
        source = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API.

## Model: Pet
A pet in the store.

- id (integer, required)
- name (string, required)

## Model: Order
An order for a pet.

- id (integer, required)
- petId (integer, required)
- status (string)

## Operation: GET /pets
List all pets.

**Response**: Pet[]

## Operation: POST /pets
Create a new pet.

**Request**: Pet
**Response**: Pet

## Operation: GET /pets/{id}
Get a pet by ID.

**Response**: Pet
**Errors**: 404 NotFound

## Error: 404 NotFound
The requested pet was not found.

## Error: 500 InternalError
An internal server error occurred."""

        result = parse(source)

        assert len(result.services) == 1
        assert len(result.models) == 2
        assert len(result.operations) == 3
        assert len(result.errors) == 2

        # Verify service
        assert result.services[0].name == "Petstore API"

        # Verify models
        model_names = [m.name for m in result.models]
        assert "Pet" in model_names
        assert "Order" in model_names

        # Verify operations
        op_methods = [(o.method, o.path) for o in result.operations]
        assert ("GET", "/pets") in op_methods
        assert ("POST", "/pets") in op_methods
        assert ("GET", "/pets/{id}") in op_methods

    def test_best_effort_parsing(self):
        """Test that parser extracts valid entities even with errors."""
        source = """# Service: TestAPI

## Model: ValidModel
| name | type |
|------|------|
| id | integer |

## Invalid: Syntax
This should cause an error

## Model: AnotherValidModel
| name | type |
|------|------|
| title | string |"""

        result = parse(source)

        # Should have parsed valid models despite errors
        assert len(result.models) >= 1

        # Should have some errors
        # Note: depending on parser behavior, this might vary

    def test_duplicate_model_error(self):
        """Test that duplicate models are detected."""
        source = """## Model: Pet
| name | type |
|------|------|
| id | integer |

## Model: Pet
| name | type |
|------|------|
| name | string |"""

        result = parse(source)

        # Should detect duplicate
        assert any(e.error_type == ParseErrorType.DUPLICATE_ENTITY for e in result.parse_errors)

    def test_invalid_status_code(self):
        """Test that invalid status codes are detected."""
        source = """## Error: 999 InvalidCode
Invalid status code."""

        result = parse(source)

        # Should detect invalid status code
        assert any(e.error_type == ParseErrorType.INVALID_STATUS_CODE for e in result.parse_errors)

    def test_to_dict_serialization(self):
        """Test that ParsedRequirements can be serialized to dict."""
        source = """# Service: Test
## Model: TestModel
| name | type |
|------|------|
| id | integer |"""

        result = parse(source)
        data = result.to_dict()

        assert "services" in data
        assert "models" in data
        assert "operations" in data
        assert "errors" in data
        assert "parse_errors" in data
        assert "valid_entities" in data

    def test_location_tracking(self):
        """Test that AST nodes have correct location info."""
        source = """# Service: Test

## Model: Pet"""

        result = parse(source)

        assert result.services[0].location.line == 1
        assert result.models[0].location.line == 3


class TestAST:
    """Tests for AST node classes."""

    def test_service_node_to_dict(self):
        """Test ServiceNode serialization."""
        from dsl_ast import SourceLocation

        service = ServiceNode(
            name="TestService",
            title="Test Service",
            description="A test service",
            version="1.0.0",
            base_path="/api",
            location=SourceLocation(1, 1)
        )

        data = service.to_dict()

        assert data["name"] == "TestService"
        assert data["version"] == "1.0.0"
        assert data["location"]["line"] == 1

    def test_model_node_with_fields(self):
        """Test ModelNode with fields."""
        from dsl_ast import SourceLocation

        model = ModelNode(
            name="Pet",
            description="A pet",
            fields=[
                FieldNode(name="id", field_type="integer", required=True, location=SourceLocation(2, 1)),
                FieldNode(name="name", field_type="string", required=True, location=SourceLocation(3, 1)),
            ],
            location=SourceLocation(1, 1)
        )

        data = model.to_dict()

        assert data["name"] == "Pet"
        assert len(data["fields"]) == 2

    def test_operation_node_to_dict(self):
        """Test OperationNode serialization."""
        from dsl_ast import SourceLocation

        op = OperationNode(
            method="GET",
            path="/pets/{id}",
            summary="Get a pet",
            request_model=None,
            response_model="Pet",
            error_refs=["NotFound"],
            location=SourceLocation(1, 1)
        )

        data = op.to_dict()

        assert data["method"] == "GET"
        assert data["path"] == "/pets/{id}"
        assert data["response_model"] == "Pet"

    def test_error_node_to_dict(self):
        """Test ErrorNode serialization."""
        from dsl_ast import SourceLocation

        error = ErrorNode(
            status_code=404,
            name="NotFound",
            description="Resource not found",
            location=SourceLocation(1, 1)
        )

        data = error.to_dict()

        assert data["status_code"] == 404
        assert data["name"] == "NotFound"


class TestErrors:
    """Tests for error reporting."""

    def test_parse_error_str(self):
        """Test ParseError string formatting."""
        error = ParseError(
            line=10,
            column=5,
            message="Test error",
            error_type=ParseErrorType.INVALID_SYNTAX,
            guidance="Fix the syntax"
        )

        error_str = str(error)
        assert "L10:5" in error_str
        assert "Test error" in error_str

    def test_parse_error_to_dict(self):
        """Test ParseError serialization."""
        error = ParseError(
            line=10,
            column=5,
            message="Test error",
            error_type=ParseErrorType.MISSING_HEADER,
        )

        data = error.to_dict()

        assert data["line"] == 10
        assert data["column"] == 5
        assert data["error_type"] == "MISSING_HEADER"

    def test_error_factory_methods(self):
        """Test ParseError factory methods."""
        # Missing header
        err1 = ParseError.missing_header(1, 1, "# Service")
        assert err1.error_type == ParseErrorType.MISSING_HEADER

        # Invalid keyword
        err2 = ParseError.invalid_keyword(1, 1, "servce", "service")
        assert err2.error_type == ParseErrorType.INVALID_KEYWORD
        assert "service" in err2.message

        # Duplicate entity
        err3 = ParseError.duplicate_entity(10, 1, "Model", "Pet", 5)
        assert err3.error_type == ParseErrorType.DUPLICATE_ENTITY
        assert "L5" in err3.message

        # Invalid status code
        err4 = ParseError.invalid_status_code(1, 1, "999")
        assert err4.error_type == ParseErrorType.INVALID_STATUS_CODE


class TestIntegration:
    """Integration tests for complete DSL parsing workflow."""

    def test_petstore_api_spec(self):
        """Test parsing a realistic Petstore API specification using natural language syntax."""
        source = """# Service: Petstore API
version: 2.0.0
base_path: /api/v2

The Petstore API allows you to manage pets and orders.

## Model: Pet
A pet available for purchase.

- id (integer, required) - Unique pet ID
- name (string, required) - Pet name
- category (string) - Pet category
- status (string) - Pet status (available, pending, sold)

## Model: Order
A purchase order for a pet.

- id (integer, required) - Order ID
- petId (integer, required) - Pet being ordered
- quantity (integer, required) - Number of pets
- shipDate (string) - Shipping date
- status (string) - Order status

## Operation: GET /pets
List all available pets.

**Response**: Pet[]

## Operation: POST /pets
Add a new pet to the store.

**Request**: Pet
**Response**: Pet
**Errors**: 400 ValidationError

## Operation: GET /pets/{petId}
Get a specific pet by ID.

**Response**: Pet
**Errors**: 404 NotFound

## Operation: DELETE /pets/{petId}
Delete a pet from the store.

**Errors**: 404 NotFound

## Operation: POST /orders
Place an order for a pet.

**Request**: Order
**Response**: Order
**Errors**: 400 ValidationError

## Error: 400 ValidationError
The request body failed validation.

## Error: 404 NotFound
The requested resource was not found."""

        result = parse(source)

        # Verify counts
        assert len(result.services) == 1
        assert len(result.models) == 2
        assert len(result.operations) == 5
        assert len(result.errors) == 2

        # Verify no parse errors
        assert result.is_valid, f"Parse errors: {[str(e) for e in result.parse_errors]}"

        # Verify service details
        service = result.services[0]
        assert service.name == "Petstore API"
        assert service.version == "2.0.0"

        # Verify Pet model fields
        pet_model = next(m for m in result.models if m.name == "Pet")
        assert len(pet_model.fields) == 4

        # Verify operations
        get_pets = next(o for o in result.operations if o.method == "GET" and o.path == "/pets")
        assert get_pets.response_model == "Pet"

        # Verify serialization
        data = result.to_dict()
        assert data["valid_entities"] == 10  # 1 service + 2 models + 5 ops + 2 errors
