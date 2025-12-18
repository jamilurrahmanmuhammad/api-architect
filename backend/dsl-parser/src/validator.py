"""
T048: DSL Validator Module.

Validates parsed DSL for:
- Required fields (service version, model names, etc.)
- Type checking (valid field types)
- Constraint validation (min < max, valid ranges)
- Reference integrity (operations reference existing models)
- Duplicate detection (unique model/operation names)

Validation occurs after parsing; errors are semantic-level.
"""

from dataclasses import dataclass, field
from typing import Optional

from .dsl_ast import (
    ParsedRequirements,
    ServiceNode,
    ModelNode,
    OperationNode,
    ErrorNode,
    FieldNode,
    FieldType,
    HTTPMethod,
)
from .errors import ParseError, ParseErrorType, ErrorSeverity


# Valid field types
VALID_FIELD_TYPES = {t.value for t in FieldType}

# Valid HTTP methods
VALID_HTTP_METHODS = {m.value for m in HTTPMethod}


@dataclass
class ValidationResult:
    """Result of DSL validation."""
    is_valid: bool
    errors: list[ParseError] = field(default_factory=list)

    @property
    def error_count(self) -> int:
        """Count of errors (not warnings)."""
        return sum(1 for e in self.errors if e.severity == ErrorSeverity.ERROR)

    @property
    def warning_count(self) -> int:
        """Count of warnings."""
        return sum(1 for e in self.errors if e.severity == ErrorSeverity.WARNING)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "error_count": self.error_count,
            "warning_count": self.warning_count,
        }


class DSLValidator:
    """
    Validates parsed DSL requirements.

    Performs semantic validation after parsing completes.
    Collects all errors rather than failing on first error.
    """

    def __init__(self):
        self._errors: list[ParseError] = []
        self._model_names: dict[str, int] = {}  # name -> line number
        self._error_names: dict[str, int] = {}  # name -> line number
        self._operation_keys: dict[str, int] = {}  # "METHOD /path" -> line number

    def validate(self, ast: ParsedRequirements) -> ValidationResult:
        """
        Validate parsed requirements.

        Args:
            ast: ParsedRequirements from the parser

        Returns:
            ValidationResult with is_valid flag and any errors
        """
        self._errors = []
        self._model_names = {}
        self._error_names = {}
        self._operation_keys = {}

        # First pass: collect entity names for reference validation
        self._collect_entity_names(ast)

        # Validate services
        for service in ast.services:
            self._validate_service(service)

        # Validate models
        for model in ast.models:
            self._validate_model(model)

        # Validate operations
        for operation in ast.operations:
            self._validate_operation(operation)

        # Validate errors
        for error in ast.errors:
            self._validate_error(error)

        # Check for duplicates (already collected during first pass)
        # Errors are already added in _collect_entity_names

        is_valid = len([e for e in self._errors if e.severity == ErrorSeverity.ERROR]) == 0
        return ValidationResult(is_valid=is_valid, errors=self._errors)

    def _collect_entity_names(self, ast: ParsedRequirements) -> None:
        """Collect entity names for duplicate and reference checking."""
        # Collect model names
        for model in ast.models:
            if model.name in self._model_names:
                self._errors.append(
                    ParseError.duplicate_entity(
                        line=model.location.line,
                        column=model.location.column,
                        entity_type="Model",
                        name=model.name,
                        first_line=self._model_names[model.name],
                    )
                )
            else:
                self._model_names[model.name] = model.location.line

        # Collect error names
        for error in ast.errors:
            if error.name in self._error_names:
                self._errors.append(
                    ParseError.duplicate_entity(
                        line=error.location.line,
                        column=error.location.column,
                        entity_type="Error",
                        name=error.name,
                        first_line=self._error_names[error.name],
                    )
                )
            else:
                self._error_names[error.name] = error.location.line

        # Collect operation keys (METHOD /path)
        for op in ast.operations:
            key = f"{op.method} {op.path}"
            if key in self._operation_keys:
                self._errors.append(
                    ParseError.duplicate_entity(
                        line=op.location.line,
                        column=op.location.column,
                        entity_type="Operation",
                        name=key,
                        first_line=self._operation_keys[key],
                    )
                )
            else:
                self._operation_keys[key] = op.location.line

    def _validate_service(self, service: ServiceNode) -> None:
        """Validate service definition."""
        # Check required version field
        if not service.version or service.version == "":
            self._errors.append(
                ParseError.missing_required_field(
                    line=service.location.line,
                    column=service.location.column,
                    entity_type="Service",
                    field_name="version",
                )
            )

    def _validate_model(self, model: ModelNode) -> None:
        """Validate model definition."""
        # Validate each field
        for field_node in model.fields:
            self._validate_field(field_node, model.name)

    def _validate_field(self, field_node: FieldNode, model_name: str) -> None:
        """Validate field definition."""
        # Check required field name
        if not field_node.name or field_node.name.strip() == "":
            self._errors.append(
                ParseError.missing_required_field(
                    line=field_node.location.line,
                    column=field_node.location.column,
                    entity_type=f"Field in {model_name}",
                    field_name="name",
                )
            )

        # Check valid field type
        field_type = field_node.field_type.lower()
        if field_type not in VALID_FIELD_TYPES:
            # Check if it's a model reference
            if field_type not in {m.lower() for m in self._model_names}:
                self._errors.append(
                    ParseError.invalid_type(
                        line=field_node.location.line,
                        column=field_node.location.column,
                        type_name=field_node.field_type,
                        valid_types=list(VALID_FIELD_TYPES),
                    )
                )

        # Validate constraints
        self._validate_constraints(field_node)

    def _validate_constraints(self, field_node: FieldNode) -> None:
        """Validate field constraints."""
        constraints = field_node.constraints
        if not constraints:
            return

        # Check min/max range for numeric types
        min_val = constraints.get("min")
        max_val = constraints.get("max")
        if min_val is not None and max_val is not None:
            try:
                if float(min_val) > float(max_val):
                    self._errors.append(
                        ParseError(
                            line=field_node.location.line,
                            column=field_node.location.column,
                            message=f"'min' ({min_val}) cannot be greater than 'max' ({max_val})",
                            error_type=ParseErrorType.CONSTRAINT_VIOLATION,
                            guidance="Ensure min <= max",
                        )
                    )
            except (ValueError, TypeError):
                pass  # Non-numeric values handled elsewhere

        # Check minLength/maxLength range for string types
        min_len = constraints.get("minLength")
        max_len = constraints.get("maxLength")
        if min_len is not None and max_len is not None:
            try:
                if int(min_len) > int(max_len):
                    self._errors.append(
                        ParseError(
                            line=field_node.location.line,
                            column=field_node.location.column,
                            message=f"'minLength' ({min_len}) cannot be greater than 'maxLength' ({max_len})",
                            error_type=ParseErrorType.CONSTRAINT_VIOLATION,
                            guidance="Ensure minLength <= maxLength",
                        )
                    )
            except (ValueError, TypeError):
                pass

    def _validate_operation(self, operation: OperationNode) -> None:
        """Validate operation definition."""
        # Check valid HTTP method
        if operation.method.upper() not in VALID_HTTP_METHODS:
            self._errors.append(
                ParseError.invalid_http_method(
                    line=operation.location.line,
                    column=operation.location.column,
                    method=operation.method,
                )
            )

        # Check response model reference
        if operation.response_model:
            response_model = operation.response_model.rstrip("[]")  # Handle array notation
            if response_model not in self._model_names:
                self._errors.append(
                    ParseError.undefined_reference(
                        line=operation.location.line,
                        column=operation.location.column,
                        ref_type="Model",
                        ref_name=response_model,
                        available=list(self._model_names.keys()),
                    )
                )

        # Check request model reference
        if operation.request_model:
            request_model = operation.request_model.rstrip("[]")
            if request_model not in self._model_names:
                self._errors.append(
                    ParseError.undefined_reference(
                        line=operation.location.line,
                        column=operation.location.column,
                        ref_type="Model",
                        ref_name=request_model,
                        available=list(self._model_names.keys()),
                    )
                )

        # Check error references
        for error_ref in operation.error_refs:
            # Error refs can be "404 NotFound" format, extract name
            parts = error_ref.split()
            error_name = parts[-1] if parts else error_ref
            if error_name not in self._error_names:
                self._errors.append(
                    ParseError.undefined_reference(
                        line=operation.location.line,
                        column=operation.location.column,
                        ref_type="Error",
                        ref_name=error_name,
                        available=list(self._error_names.keys()),
                    )
                )

    def _validate_error(self, error: ErrorNode) -> None:
        """Validate error definition."""
        # Check valid HTTP status code (100-599)
        if error.status_code < 100 or error.status_code > 599:
            self._errors.append(
                ParseError.invalid_status_code(
                    line=error.location.line,
                    column=error.location.column,
                    code=str(error.status_code),
                )
            )


def validate_dsl(content: str) -> ValidationResult:
    """
    Convenience function to parse and validate DSL content.

    Args:
        content: DSL source text

    Returns:
        ValidationResult with is_valid flag and any errors
    """
    from .parser import Parser

    parser = Parser(content)
    ast = parser.parse()

    # If there were parse errors, include them in validation result
    if ast.parse_errors:
        parse_errors = [
            ParseError(
                line=e.line if hasattr(e, 'line') else 1,
                column=e.column if hasattr(e, 'column') else 1,
                message=e.message if hasattr(e, 'message') else str(e),
                error_type=e.error_type if hasattr(e, 'error_type') else ParseErrorType.INVALID_SYNTAX,
            )
            for e in ast.parse_errors
        ]
        return ValidationResult(is_valid=False, errors=parse_errors)

    validator = DSLValidator()
    return validator.validate(ast)
