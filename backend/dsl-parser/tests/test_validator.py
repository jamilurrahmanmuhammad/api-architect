"""
T045: Unit tests for DSL validator.

Tests validation rules:
- Syntax errors (missing fields, invalid types)
- Semantic errors (type mismatches, undefined references)
- Required field validation
- Constraint validation
"""

import pytest
from src.validator import DSLValidator, ValidationResult
from src.parser import Parser
from src.errors import ParseErrorType, ErrorSeverity


def parse_dsl(dsl: str):
    """Helper to parse DSL content."""
    return Parser(dsl).parse()


class TestValidatorBasicRules:
    """Tests for basic validation rules."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        """Create a validator instance."""
        return DSLValidator()

    def test_valid_service_definition(self, validator):
        """Test validation passes for valid service definition."""
        dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert result.is_valid
        assert len(result.errors) == 0

    def test_service_with_empty_version(self, validator):
        """Test validation fails when service has empty version.

        Note: Parser provides default version, so we test with explicit empty version
        by manually creating AST.
        """
        from src.dsl_ast import ServiceNode, SourceLocation, ParsedRequirements

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="",  # Empty version
            base_path="/api",
            operations=[],
        )
        ast = ParsedRequirements(services=[service])
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.MISSING_REQUIRED_FIELD for e in result.errors)

    def test_valid_model_definition(self, validator):
        """Test validation passes for valid model definition using natural language syntax."""
        dsl = """# Service: Test API
version: 1.0.0

## Model: Pet
A pet in the store.

- id (integer, required) - Unique ID
- name (string, required) - Pet name
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert result.is_valid
        assert len(result.errors) == 0

    def test_model_invalid_field_type(self, validator):
        """Test validation fails for invalid field type."""
        dsl = """# Service: Test API
version: 1.0.0

## Model: Pet
- id (invalid_type, required)
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.INVALID_TYPE for e in result.errors)

    def test_model_missing_required_field_name(self, validator):
        """Test validation fails when model field missing name.

        Note: We test with explicit empty field name by manually creating AST.
        """
        from src.dsl_ast import ModelNode, FieldNode, SourceLocation, ParsedRequirements, ServiceNode

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="1.0.0",
            base_path="/api",
            operations=[],
        )
        model = ModelNode(
            location=SourceLocation(line=3, column=1),
            name="Pet",
            description="A pet",
            fields=[
                FieldNode(
                    location=SourceLocation(line=5, column=1),
                    name="",  # Empty name
                    field_type="string",
                    required=True,
                    description=None,
                    constraints={},
                )
            ],
        )
        ast = ParsedRequirements(services=[service], models=[model])
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.MISSING_REQUIRED_FIELD for e in result.errors)


class TestValidatorOperationRules:
    """Tests for operation validation rules."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        return DSLValidator()

    def test_valid_operation(self, validator):
        """Test validation passes for valid operation."""
        dsl = """# Service: Test API
version: 1.0.0

## Model: Pet
- id (integer, required)

## Operation: GET /pets
List all pets.

**Response**: Pet[]
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert result.is_valid

    def test_operation_invalid_http_method(self, validator):
        """Test validation fails for invalid HTTP method.

        Note: Parser normalizes methods, so we test with explicit invalid method
        by manually creating AST.
        """
        from src.dsl_ast import OperationNode, SourceLocation, ParsedRequirements, ServiceNode

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="1.0.0",
            base_path="/api",
            operations=[],
        )
        operation = OperationNode(
            location=SourceLocation(line=3, column=1),
            method="FETCH",  # Invalid HTTP method
            path="/pets",
            summary="Invalid method",
            description=None,
            request_model=None,
            response_model=None,
            error_refs=[],
            tags=[],
        )
        ast = ParsedRequirements(services=[service], operations=[operation])
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.INVALID_HTTP_METHOD for e in result.errors)

    def test_operation_undefined_response_model(self, validator):
        """Test validation fails when response references undefined model."""
        dsl = """# Service: Test API
version: 1.0.0

## Operation: GET /pets
**Response**: UndefinedModel
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.UNDEFINED_REFERENCE for e in result.errors)


class TestValidatorErrorRules:
    """Tests for error definition validation rules."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        return DSLValidator()

    def test_valid_error_definition(self, validator):
        """Test validation passes for valid error definition."""
        dsl = """# Service: Test API
version: 1.0.0

## Error: 404 NotFound
Resource not found.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert result.is_valid

    def test_error_invalid_status_code(self, validator):
        """Test validation fails for invalid status code."""
        dsl = """# Service: Test API
version: 1.0.0

## Error: 999 InvalidStatus
Invalid status code.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.INVALID_STATUS_CODE for e in result.errors)

    def test_error_status_code_out_of_range(self, validator):
        """Test validation fails for status code outside valid range.

        Note: Parser normalizes non-numeric codes, so we test range validation
        with explicit invalid status code by manually creating AST.
        """
        from src.dsl_ast import ErrorNode, SourceLocation, ParsedRequirements, ServiceNode

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="1.0.0",
            base_path="/api",
            operations=[],
        )
        error = ErrorNode(
            location=SourceLocation(line=3, column=1),
            name="BadCode",
            status_code=50,  # Below valid range (100-599)
            description="Invalid status code",
        )
        ast = ParsedRequirements(services=[service], errors=[error])
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.INVALID_STATUS_CODE for e in result.errors)


class TestValidatorDuplicates:
    """Tests for duplicate entity detection."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        return DSLValidator()

    def test_duplicate_model_names(self, validator):
        """Test validation fails for duplicate model names."""
        dsl = """# Service: Test API
version: 1.0.0

## Model: Pet
- id (integer, required)

## Model: Pet
- name (string, required)
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.DUPLICATE_ENTITY for e in result.errors)

    def test_duplicate_operation_paths(self, validator):
        """Test validation fails for duplicate operation paths."""
        dsl = """# Service: Test API
version: 1.0.0

## Operation: GET /pets
First operation.

## Operation: GET /pets
Duplicate operation.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.DUPLICATE_ENTITY for e in result.errors)


class TestValidatorConstraints:
    """Tests for field constraint validation."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        return DSLValidator()

    def test_valid_string_constraints(self, validator):
        """Test validation passes for valid string constraints."""
        from src.dsl_ast import ModelNode, FieldNode, SourceLocation, ParsedRequirements, ServiceNode

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="1.0.0",
            base_path="/api",
            operations=[],
        )
        model = ModelNode(
            location=SourceLocation(line=3, column=1),
            name="User",
            description="A user",
            fields=[
                FieldNode(
                    location=SourceLocation(line=5, column=1),
                    name="email",
                    field_type="string",
                    required=True,
                    description=None,
                    constraints={"minLength": 5, "maxLength": 100},
                )
            ],
        )
        ast = ParsedRequirements(services=[service], models=[model])
        result = validator.validate(ast)

        assert result.is_valid

    def test_invalid_min_max_range(self, validator):
        """Test validation fails when min > max."""
        from src.dsl_ast import ModelNode, FieldNode, SourceLocation, ParsedRequirements, ServiceNode

        service = ServiceNode(
            location=SourceLocation(line=1, column=1),
            name="Test API",
            title="Test API",
            description="Test",
            version="1.0.0",
            base_path="/api",
            operations=[],
        )
        model = ModelNode(
            location=SourceLocation(line=3, column=1),
            name="User",
            description="A user",
            fields=[
                FieldNode(
                    location=SourceLocation(line=5, column=1),
                    name="age",
                    field_type="integer",
                    required=True,
                    description=None,
                    constraints={"min": 100, "max": 10},  # Invalid: min > max
                )
            ],
        )
        ast = ParsedRequirements(services=[service], models=[model])
        result = validator.validate(ast)

        assert not result.is_valid
        assert any(e.error_type == ParseErrorType.CONSTRAINT_VIOLATION for e in result.errors)


class TestValidationResult:
    """Tests for ValidationResult class."""

    def test_validation_result_valid(self):
        """Test ValidationResult for valid input."""
        result = ValidationResult(is_valid=True, errors=[])

        assert result.is_valid
        assert len(result.errors) == 0
        assert result.error_count == 0
        assert result.warning_count == 0

    def test_validation_result_with_errors(self):
        """Test ValidationResult with errors."""
        from src.errors import ParseError, ParseErrorType

        errors = [
            ParseError(
                line=1,
                column=1,
                message="Test error",
                error_type=ParseErrorType.INVALID_SYNTAX,
            )
        ]
        result = ValidationResult(is_valid=False, errors=errors)

        assert not result.is_valid
        assert len(result.errors) == 1
        assert result.error_count == 1

    def test_validation_result_to_dict(self):
        """Test ValidationResult serialization."""
        result = ValidationResult(is_valid=True, errors=[])
        data = result.to_dict()

        assert data["valid"] is True
        assert data["errors"] == []
        assert "error_count" in data
        assert "warning_count" in data


class TestValidatorCompleteDSL:
    """Tests for complete DSL validation scenarios."""

    @pytest.fixture
    def validator(self) -> DSLValidator:
        return DSLValidator()

    def test_complete_valid_dsl(self, validator):
        """Test validation passes for complete valid DSL using natural language syntax."""
        dsl = """# Service: Petstore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API for managing pets.

## Model: Pet
A pet in the store.

- id (integer, required) - Unique identifier
- name (string, required) - Pet name
- status (string) - Pet status

## Model: Error
Standard error response.

- code (integer, required) - Error code
- message (string, required) - Error message

## Operation: GET /pets
List all pets.

**Response**: Pet[]

## Operation: GET /pets/{id}
Get a pet by ID.

**Response**: Pet
**Errors**: 404 NotFound

## Operation: POST /pets
Create a new pet.

**Request**: Pet
**Response**: Pet
**Errors**: 400 ValidationError

## Error: 404 NotFound
The requested resource was not found.

## Error: 400 ValidationError
Invalid request data.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert result.is_valid
        assert len(result.errors) == 0

    def test_multiple_validation_errors(self, validator):
        """Test validator collects multiple errors."""
        dsl = """# Service: Bad API

## Model: Pet
- unnamed (invalid_type, required)
- id (another_invalid)

## Operation: FETCH /pets
Invalid method.

## Error: 999 BadStatus
Invalid status.
"""
        ast = parse_dsl(dsl)
        result = validator.validate(ast)

        assert not result.is_valid
        # Should have multiple errors collected (invalid types + invalid status code)
        assert len(result.errors) >= 2
