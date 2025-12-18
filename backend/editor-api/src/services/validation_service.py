"""
Validation service for DSL content.

Provides DSL validation functionality for the editor API.
Implements core validation rules inline to avoid cross-package dependencies.

NOTE: This is a simplified implementation. For full validation functionality,
consider using the dsl-parser package when proper package management is in place.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ErrorSeverity(Enum):
    """Severity level for validation errors."""
    ERROR = "error"
    WARNING = "warning"


class ErrorType(Enum):
    """Types of validation errors."""
    INVALID_SYNTAX = "INVALID_SYNTAX"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_TYPE = "INVALID_TYPE"
    INVALID_HTTP_METHOD = "INVALID_HTTP_METHOD"
    INVALID_STATUS_CODE = "INVALID_STATUS_CODE"
    UNDEFINED_REFERENCE = "UNDEFINED_REFERENCE"
    DUPLICATE_ENTITY = "DUPLICATE_ENTITY"
    CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION"


@dataclass
class ValidationError:
    """Represents a validation error."""
    line: int
    column: int
    message: str
    error_type: ErrorType
    severity: ErrorSeverity = ErrorSeverity.ERROR
    guidance: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "line": self.line,
            "column": self.column,
            "message": self.message,
            "error_type": self.error_type.value,
            "severity": self.severity.value,
            "guidance": self.guidance,
        }


# Valid field types
VALID_FIELD_TYPES = {
    "string", "integer", "number", "boolean", "array", "object",
    "date", "datetime", "email", "uuid", "uri", "url"
}

# Valid HTTP methods
VALID_HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}


class ValidationService:
    """Service for validating DSL content."""

    def validate(self, content: str) -> dict[str, Any]:
        """
        Validate DSL content and return validation result.

        Args:
            content: DSL source text to validate

        Returns:
            dict with validation result including:
            - valid: bool indicating if content is valid
            - errors: list of error dictionaries
            - error_count: number of errors
            - warning_count: number of warnings
        """
        # Handle empty content
        if not content or not content.strip():
            return {
                "valid": True,
                "errors": [],
                "error_count": 0,
                "warning_count": 0,
            }

        errors: list[ValidationError] = []
        lines = content.split('\n')

        # Track entities for duplicate detection
        model_names: dict[str, int] = {}
        error_names: dict[str, int] = {}
        operation_keys: dict[str, int] = {}

        # Parse and validate
        has_service = False
        has_version = False
        current_model: str | None = None
        in_model_table = False

        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()

            # Service header
            if stripped.startswith("# Service:"):
                has_service = True
                continue

            # Version field
            if stripped.startswith("version:"):
                has_version = True
                version = stripped[8:].strip()
                if not version:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message="Version field is empty",
                        error_type=ErrorType.MISSING_REQUIRED_FIELD,
                        guidance="Provide a version like '1.0.0'",
                    ))
                continue

            # Model definition
            model_match = re.match(r'^## Model:\s*(\w+)', stripped)
            if model_match:
                model_name = model_match.group(1)
                if model_name in model_names:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Duplicate model '{model_name}' (first defined at line {model_names[model_name]})",
                        error_type=ErrorType.DUPLICATE_ENTITY,
                        guidance="Use unique model names",
                    ))
                else:
                    model_names[model_name] = line_num
                current_model = model_name
                in_model_table = False
                continue

            # Operation definition
            op_match = re.match(r'^## Operation:\s*(\w+)\s+(/\S+)', stripped)
            if op_match:
                method = op_match.group(1).upper()
                path = op_match.group(2)
                op_key = f"{method} {path}"

                if method not in VALID_HTTP_METHODS:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Invalid HTTP method '{method}'",
                        error_type=ErrorType.INVALID_HTTP_METHOD,
                        guidance=f"Valid methods: {', '.join(VALID_HTTP_METHODS)}",
                    ))

                if op_key in operation_keys:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Duplicate operation '{op_key}' (first defined at line {operation_keys[op_key]})",
                        error_type=ErrorType.DUPLICATE_ENTITY,
                        guidance="Use unique method/path combinations",
                    ))
                else:
                    operation_keys[op_key] = line_num
                current_model = None
                continue

            # Error definition
            err_match = re.match(r'^## Error:\s*(\d+)\s+(\w+)', stripped)
            if err_match:
                status_code = int(err_match.group(1))
                error_name = err_match.group(2)

                if status_code < 100 or status_code > 599:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Invalid HTTP status code '{status_code}'",
                        error_type=ErrorType.INVALID_STATUS_CODE,
                        guidance="Status codes must be between 100 and 599",
                    ))

                if error_name in error_names:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Duplicate error '{error_name}' (first defined at line {error_names[error_name]})",
                        error_type=ErrorType.DUPLICATE_ENTITY,
                        guidance="Use unique error names",
                    ))
                else:
                    error_names[error_name] = line_num
                current_model = None
                continue

            # Model table header
            if current_model and stripped.startswith('| name | type'):
                in_model_table = True
                continue

            # Model table separator
            if in_model_table and stripped.startswith('|--'):
                continue

            # Model field row
            if in_model_table and stripped.startswith('|') and '|' in stripped[1:]:
                parts = [p.strip() for p in stripped.split('|')[1:-1]]
                if len(parts) >= 2:
                    field_name = parts[0]
                    field_type = parts[1].lower()

                    # Check for empty field name
                    if not field_name:
                        errors.append(ValidationError(
                            line=line_num,
                            column=1,
                            message=f"Field in model '{current_model}' has empty name",
                            error_type=ErrorType.MISSING_REQUIRED_FIELD,
                            guidance="Provide a name for the field",
                        ))

                    # Check for valid type
                    if field_type and field_type not in VALID_FIELD_TYPES:
                        # Check if it's a model reference
                        if field_type not in {m.lower() for m in model_names}:
                            errors.append(ValidationError(
                                line=line_num,
                                column=1,
                                message=f"Invalid type '{field_type}' for field '{field_name}'",
                                error_type=ErrorType.INVALID_TYPE,
                                guidance=f"Valid types: {', '.join(sorted(VALID_FIELD_TYPES))}",
                            ))
                continue

            # Response/Request model reference
            response_match = re.match(r'\*\*Response\*\*:\s*(\w+)', stripped)
            if response_match:
                ref_model = response_match.group(1).rstrip('[]')
                if ref_model not in model_names:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Undefined model reference '{ref_model}'",
                        error_type=ErrorType.UNDEFINED_REFERENCE,
                        guidance=f"Define model '{ref_model}' before referencing it",
                    ))
                continue

            request_match = re.match(r'\*\*Request\*\*:\s*(\w+)', stripped)
            if request_match:
                ref_model = request_match.group(1).rstrip('[]')
                if ref_model not in model_names:
                    errors.append(ValidationError(
                        line=line_num,
                        column=1,
                        message=f"Undefined model reference '{ref_model}'",
                        error_type=ErrorType.UNDEFINED_REFERENCE,
                        guidance=f"Define model '{ref_model}' before referencing it",
                    ))
                continue

        # Check for required service fields
        if has_service and not has_version:
            errors.append(ValidationError(
                line=1,
                column=1,
                message="Service is missing required 'version' field",
                error_type=ErrorType.MISSING_REQUIRED_FIELD,
                guidance="Add 'version: x.y.z' after the service header",
            ))

        # Calculate counts
        error_count = sum(1 for e in errors if e.severity == ErrorSeverity.ERROR)
        warning_count = sum(1 for e in errors if e.severity == ErrorSeverity.WARNING)

        return {
            "valid": error_count == 0,
            "errors": [e.to_dict() for e in errors],
            "error_count": error_count,
            "warning_count": warning_count,
        }


# Singleton instance
_validation_service: ValidationService | None = None


def get_validation_service() -> ValidationService:
    """Get singleton validation service instance."""
    global _validation_service
    if _validation_service is None:
        _validation_service = ValidationService()
    return _validation_service
