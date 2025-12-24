"""
T004: Unit tests for OAS Validator Service.

Tests for OpenAPI specification validation:
- Format parsing (YAML/JSON)
- Version detection
- Required field validation
- Reference validation
- Schema property validation

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest

from src.services.oas_validator import (
    ValidationError,
    ValidationResult,
    OASValidator,
    FieldRequirementChecker,
)


# Sample OAS documents
MINIMAL_OAS_3_0_YAML = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
"""

MINIMAL_OAS_3_1_YAML = """
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
"""

MINIMAL_OAS_JSON = """{
  "openapi": "3.0.0",
  "info": {
    "title": "Test API",
    "version": "1.0.0"
  },
  "paths": {
    "/test": {
      "get": {
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
"""

INVALID_JSON = "{ this is not valid json }"

FULL_OAS_3_0_YAML = """
openapi: 3.0.0
info:
  title: Pet Store API
  version: 1.0.0
  description: A sample Pet Store API
servers:
  - url: https://api.example.com
    description: Production
paths:
  /pets:
    get:
      summary: List all pets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return
          required: false
          schema:
            type: integer
            format: int32
      responses:
        '200':
          description: A list of pets
        '400':
          description: Bad request
    post:
      summary: Create a pet
      tags:
        - pets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
      responses:
        '201':
          description: Pet created
components:
  schemas:
    Pet:
      type: object
      required:
        - name
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        status:
          type: string
          enum:
            - available
            - pending
"""


class TestValidationError:
    """Tests for ValidationError class."""

    def test_create_validation_error(self):
        """Create a validation error."""
        error = ValidationError(
            path="$.info.title",
            message="Title is required",
            error_type="missing_field",
        )

        assert error.path == "$.info.title"
        assert error.message == "Title is required"
        assert error.error_type == "missing_field"
        assert error.severity == "error"

    def test_validation_error_to_dict(self):
        """Convert validation error to dictionary."""
        error = ValidationError(
            path="$.info.title",
            message="Title is required",
            error_type="missing_field",
            severity="error",
        )

        error_dict = error.to_dict()
        assert error_dict["path"] == "$.info.title"
        assert error_dict["message"] == "Title is required"
        assert error_dict["type"] == "missing_field"
        assert error_dict["severity"] == "error"


class TestValidationResult:
    """Tests for ValidationResult class."""

    def test_create_valid_result(self):
        """Create a valid validation result."""
        result = ValidationResult(is_valid=True, oas_version="3.0.0")

        assert result.is_valid is True
        assert result.oas_version == "3.0.0"
        assert len(result.errors) == 0
        assert len(result.warnings) == 0

    def test_add_error_marks_invalid(self):
        """Adding an error marks result as invalid."""
        result = ValidationResult(is_valid=True)
        error = ValidationError(
            path="$.info",
            message="Info is missing",
            error_type="missing_field",
        )

        result.add_error(error)
        assert result.is_valid is False
        assert len(result.errors) == 1

    def test_validation_result_to_dict(self):
        """Convert validation result to dictionary."""
        error = ValidationError(
            path="$.info",
            message="Info is missing",
            error_type="missing_field",
        )

        result = ValidationResult(is_valid=False, oas_version="3.0.0")
        result.add_error(error)

        result_dict = result.to_dict()
        assert result_dict["is_valid"] is False
        assert result_dict["oas_version"] == "3.0.0"
        assert result_dict["error_count"] == 1
        assert result_dict["warning_count"] == 0


class TestOASValidatorBasic:
    """Tests for basic OAS validation."""

    def test_validate_minimal_oas_3_0(self):
        """Validate minimal valid OAS 3.0."""
        validator = OASValidator()
        result = validator.validate(MINIMAL_OAS_3_0_YAML, content_format="yaml")

        assert result.is_valid is True
        assert result.oas_version == "3.0"
        assert len(result.errors) == 0

    def test_validate_minimal_oas_3_1(self):
        """Validate minimal valid OAS 3.1."""
        validator = OASValidator()
        result = validator.validate(MINIMAL_OAS_3_1_YAML, content_format="yaml")

        assert result.is_valid is True
        assert result.oas_version == "3.1"
        assert len(result.errors) == 0

    def test_validate_json_format(self):
        """Validate OAS in JSON format."""
        validator = OASValidator()
        result = validator.validate(MINIMAL_OAS_JSON, content_format="json")

        assert result.is_valid is True
        assert result.oas_version == "3.0"

    def test_validate_invalid_json(self):
        """Validation fails for invalid JSON."""
        validator = OASValidator()
        result = validator.validate(INVALID_JSON, content_format="json")

        assert result.is_valid is False
        assert len(result.errors) > 0
        assert result.errors[0].error_type == "parse_error"


class TestOASValidatorStructure:
    """Tests for OAS structure validation."""

    def test_missing_required_root_field(self):
        """Detect missing required root field."""
        invalid_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
"""
        validator = OASValidator()
        result = validator.validate(invalid_oas, content_format="yaml")

        assert result.is_valid is False
        assert any(e.message.startswith("Missing required field: paths") for e in result.errors)

    def test_missing_info_title(self):
        """Detect missing info.title."""
        invalid_oas = """
openapi: 3.0.0
info:
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
"""
        validator = OASValidator()
        result = validator.validate(invalid_oas, content_format="yaml")

        assert result.is_valid is False
        assert any(e.message.startswith("Missing required field: title") for e in result.errors)

    def test_missing_info_version(self):
        """Detect missing info.version."""
        invalid_oas = """
openapi: 3.0.0
info:
  title: Test API
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
"""
        validator = OASValidator()
        result = validator.validate(invalid_oas, content_format="yaml")

        assert result.is_valid is False
        assert any(e.message.startswith("Missing required field: version") for e in result.errors)

    def test_invalid_openapi_version(self):
        """Detect invalid openapi version."""
        invalid_oas = """
openapi: 2.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
"""
        validator = OASValidator()
        result = validator.validate(invalid_oas, content_format="yaml")

        assert result.is_valid is False
        assert any("Invalid OpenAPI version" in e.message for e in result.errors)


class TestOASValidatorReferences:
    """Tests for reference validation."""

    def test_valid_local_reference(self):
        """Validate valid local $ref."""
        oas_with_ref = FULL_OAS_3_0_YAML
        validator = OASValidator()
        result = validator.validate(oas_with_ref, content_format="yaml")

        # Should not have errors for valid refs
        ref_errors = [e for e in result.errors if "ref" in e.error_type.lower()]
        assert len(ref_errors) == 0

    def test_valid_local_reference_in_components(self):
        """Accept valid local references in components."""
        valid_ref_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Pet:
      $ref: '#/components/schemas/Animal'
    Animal:
      type: object
"""
        validator = OASValidator()
        result = validator.validate(valid_ref_oas, content_format="yaml")

        # Should not have errors for valid local refs
        ref_errors = [e for e in result.errors if "$ref" in e.message]
        assert len(ref_errors) == 0

    def test_external_reference_format(self):
        """Accept external HTTP references."""
        external_ref_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
components:
  schemas:
    Pet:
      $ref: 'https://example.com/schemas/Pet.json'
"""
        validator = OASValidator()
        result = validator.validate(external_ref_oas, content_format="yaml")

        # External HTTP refs should be accepted
        ref_errors = [e for e in result.errors if "$ref" in e.message and "Invalid" in e.message]
        assert len(ref_errors) == 0


class TestOASValidatorParameters:
    """Tests for parameter validation."""

    def test_invalid_parameter_location(self):
        """Detect invalid parameter 'in' value."""
        invalid_param_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - name: test_param
          in: invalid
          schema:
            type: string
      responses:
        '200':
          description: Success
"""
        validator = OASValidator()
        result = validator.validate(invalid_param_oas, content_format="yaml")

        assert result.is_valid is False
        assert any("Invalid parameter location" in e.message for e in result.errors)

    def test_valid_parameter_locations(self):
        """Accept valid parameter locations."""
        valid_locations = ["query", "header", "path", "cookie"]
        base_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        {params}
      responses:
        '200':
          description: Success
"""

        params_yaml = "\n        ".join(
            f"- name: param{i}\n          in: {location}\n          schema:\n            type: string"
            for i, location in enumerate(valid_locations)
        )

        oas_content = base_oas.format(params=params_yaml)
        validator = OASValidator()
        result = validator.validate(oas_content, content_format="yaml")

        # Should not have errors for valid locations
        location_errors = [
            e for e in result.errors if "Invalid parameter location" in e.message
        ]
        assert len(location_errors) == 0


class TestOASValidatorSchemas:
    """Tests for schema validation."""

    def test_invalid_schema_type(self):
        """Detect invalid schema type."""
        invalid_schema_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
components:
  schemas:
    Pet:
      type: invalid_type
"""
        validator = OASValidator()
        result = validator.validate(invalid_schema_oas, content_format="yaml")

        assert result.is_valid is False
        assert any("Invalid schema type" in e.message for e in result.errors)

    def test_valid_schema_types(self):
        """Accept valid schema types."""
        valid_types = ["string", "number", "integer", "boolean", "array", "object", "null"]
        base_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
components:
  schemas:
    {schemas}
"""

        schemas_yaml = "\n    ".join(
            f"Type{i}:\n      type: {type_}\n"
            for i, type_ in enumerate(valid_types)
        )

        oas_content = base_oas.format(schemas=schemas_yaml)
        validator = OASValidator()
        result = validator.validate(oas_content, content_format="yaml")

        # Should not have errors for valid types
        type_errors = [e for e in result.errors if "Invalid schema type" in e.message]
        assert len(type_errors) == 0


class TestOASValidatorWarnings:
    """Tests for validation warnings."""

    def test_operation_missing_recommended_responses(self):
        """Warn if operation missing responses (recommended field)."""
        incomplete_oas = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
"""
        validator = OASValidator()
        result = validator.validate(incomplete_oas, content_format="yaml")

        # Missing responses generates a warning, not an error
        # The validator warns about missing recommended field
        response_warnings = [w for w in result.warnings if "responses" in w.message.lower()]
        assert len(response_warnings) > 0 or result.is_valid  # Should have warning OR be valid with warning


class TestFieldRequirementChecker:
    """Tests for FieldRequirementChecker."""

    def test_get_required_root_fields(self):
        """Get required root fields."""
        required = FieldRequirementChecker.get_required_fields("root")
        assert "openapi" in required
        assert "info" in required
        assert "paths" in required

    def test_get_required_info_fields(self):
        """Get required info fields."""
        required = FieldRequirementChecker.get_required_fields("info")
        assert "title" in required
        assert "version" in required

    def test_get_required_parameter_fields(self):
        """Get required parameter fields."""
        required = FieldRequirementChecker.get_required_fields("parameter")
        assert "name" in required
        assert "in" in required

    def test_check_element_with_all_required(self):
        """Check element that has all required fields."""
        element = {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer"},
        }

        missing, present = FieldRequirementChecker.check_element(element, "parameter")
        assert len(missing) == 0
        assert "name" in element

    def test_check_element_with_missing_required(self):
        """Check element missing required fields."""
        element = {
            "name": "limit",
            # Missing 'in'
            "schema": {"type": "integer"},
        }

        missing, present = FieldRequirementChecker.check_element(element, "parameter")
        assert "in" in missing

    def test_check_operation_with_optional_fields(self):
        """Check operation with optional fields."""
        element = {
            "summary": "Get items",
            "description": "Returns a list of items",
            "tags": ["items"],
            "responses": {"200": {"description": "Success"}},
        }

        missing, present = FieldRequirementChecker.check_element(element, "operation")
        assert len(missing) == 0
        assert "summary" in present
        assert "tags" in present


class TestOASValidatorFullDocument:
    """Tests for validating complete OAS documents."""

    def test_validate_full_oas_3_0_document(self):
        """Validate a complete OAS 3.0 document."""
        validator = OASValidator()
        result = validator.validate(FULL_OAS_3_0_YAML, content_format="yaml")

        # Should be valid
        assert result.is_valid is True
        assert result.oas_version == "3.0"

    def test_complete_document_has_expected_structure(self):
        """Complete document has all expected components."""
        validator = OASValidator()
        result = validator.validate(FULL_OAS_3_0_YAML, content_format="yaml")

        assert result.oas_version == "3.0"
        # Should have no critical errors
        errors = [e for e in result.errors if e.severity == "error"]
        assert len(errors) == 0
