"""
Error reporting system for DSL Parser.

Provides structured error messages with:
- Line and column tracking
- Error type classification (syntax vs semantic)
- Human-readable messages with suggested fixes
- Integration with editor for inline error display

Error Taxonomy (per plan.md):
- Syntax Errors: Missing headers, invalid nesting, malformed tables, etc.
- Semantic Errors: Missing required fields, invalid types, constraint violations, etc.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ParseErrorType(Enum):
    """Classification of parser errors."""

    # Syntax Errors (Lexer/Parser Level)
    MISSING_HEADER = "MISSING_HEADER"
    INVALID_NESTING = "INVALID_NESTING"
    MALFORMED_TABLE = "MALFORMED_TABLE"
    UNCLOSED_BLOCK = "UNCLOSED_BLOCK"
    INVALID_KEYWORD = "INVALID_KEYWORD"
    DUPLICATE_ENTITY = "DUPLICATE_ENTITY"
    UNEXPECTED_TOKEN = "UNEXPECTED_TOKEN"
    INVALID_SYNTAX = "INVALID_SYNTAX"

    # Semantic Errors (Validation Layer)
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_TYPE = "INVALID_TYPE"
    INVALID_HTTP_METHOD = "INVALID_HTTP_METHOD"
    INVALID_STATUS_CODE = "INVALID_STATUS_CODE"
    MISSING_RESPONSE_MODEL = "MISSING_RESPONSE_MODEL"
    CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION"
    UNDEFINED_REFERENCE = "UNDEFINED_REFERENCE"

    # Warning Level
    DEPRECATED_SYNTAX = "DEPRECATED_SYNTAX"
    UNUSED_MODEL = "UNUSED_MODEL"


class ErrorSeverity(Enum):
    """Severity level of parser errors."""
    ERROR = "error"       # Parsing/validation failed
    WARNING = "warning"   # Non-blocking issue
    INFO = "info"         # Informational message


@dataclass
class ParseError:
    """
    Structured parse error with location and guidance.

    Format: [LINE:COLUMN] ERROR_TYPE: Description; Guidance

    Example:
        L12:5 MISSING_FIELD: '## Model' requires 'name:' field; add before field definitions
    """
    line: int
    column: int
    message: str
    error_type: ParseErrorType
    severity: ErrorSeverity = ErrorSeverity.ERROR
    guidance: Optional[str] = None
    context: Optional[str] = None  # Surrounding code context

    def __str__(self) -> str:
        """Format error for display."""
        base = f"L{self.line}:{self.column} {self.error_type.value}: {self.message}"
        if self.guidance:
            base += f"; {self.guidance}"
        return base

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "line": self.line,
            "column": self.column,
            "message": self.message,
            "error_type": self.error_type.value,
            "severity": self.severity.value,
            "guidance": self.guidance,
            "context": self.context,
        }

    @classmethod
    def missing_header(cls, line: int, column: int, expected: str) -> "ParseError":
        """Create error for missing section header."""
        return cls(
            line=line,
            column=column,
            message=f"Expected '{expected}' header",
            error_type=ParseErrorType.MISSING_HEADER,
            guidance=f"Valid headers: # Service, ## Model, ## Operation, ## Error",
        )

    @classmethod
    def invalid_keyword(cls, line: int, column: int, found: str, did_you_mean: Optional[str] = None) -> "ParseError":
        """Create error for invalid/unknown keyword."""
        msg = f"Unknown keyword '{found}'"
        guidance = None
        if did_you_mean:
            msg += f"; did you mean '{did_you_mean}'?"
            guidance = f"Suggested correction: {did_you_mean}"
        return cls(
            line=line,
            column=column,
            message=msg,
            error_type=ParseErrorType.INVALID_KEYWORD,
            guidance=guidance,
        )

    @classmethod
    def duplicate_entity(cls, line: int, column: int, entity_type: str, name: str, first_line: int) -> "ParseError":
        """Create error for duplicate entity definition."""
        return cls(
            line=line,
            column=column,
            message=f"{entity_type} '{name}' already defined at L{first_line}; duplicates not allowed",
            error_type=ParseErrorType.DUPLICATE_ENTITY,
            guidance=f"Remove duplicate or rename one of the {entity_type.lower()}s",
        )

    @classmethod
    def missing_required_field(cls, line: int, column: int, entity_type: str, field_name: str) -> "ParseError":
        """Create error for missing required field."""
        return cls(
            line=line,
            column=column,
            message=f"'{entity_type}' requires '{field_name}' field",
            error_type=ParseErrorType.MISSING_REQUIRED_FIELD,
            guidance=f"Add '{field_name}:' before other definitions",
        )

    @classmethod
    def invalid_type(cls, line: int, column: int, type_name: str, valid_types: list[str]) -> "ParseError":
        """Create error for invalid type reference."""
        return cls(
            line=line,
            column=column,
            message=f"Invalid type '{type_name}'",
            error_type=ParseErrorType.INVALID_TYPE,
            guidance=f"Valid types: {', '.join(valid_types)}",
        )

    @classmethod
    def invalid_http_method(cls, line: int, column: int, method: str) -> "ParseError":
        """Create error for invalid HTTP method."""
        valid_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
        return cls(
            line=line,
            column=column,
            message=f"HTTP method '{method}' not supported",
            error_type=ParseErrorType.INVALID_HTTP_METHOD,
            guidance=f"Use one of: {', '.join(valid_methods)}",
        )

    @classmethod
    def invalid_status_code(cls, line: int, column: int, code: str) -> "ParseError":
        """Create error for invalid HTTP status code."""
        return cls(
            line=line,
            column=column,
            message=f"Status code must be HTTP code (100-599); '{code}' is invalid",
            error_type=ParseErrorType.INVALID_STATUS_CODE,
            guidance="Use a valid HTTP status code (e.g., 200, 400, 404, 500)",
        )

    @classmethod
    def malformed_table(cls, line: int, column: int) -> "ParseError":
        """Create error for malformed markdown table."""
        return cls(
            line=line,
            column=column,
            message="Expected '|' delimiter in model field table; check syntax at line start",
            error_type=ParseErrorType.MALFORMED_TABLE,
            guidance="Example: | name | type | required | description |",
        )

    @classmethod
    def unclosed_block(cls, line: int, column: int, block_type: str, start_line: int) -> "ParseError":
        """Create error for unclosed block."""
        return cls(
            line=line,
            column=column,
            message=f"Unclosed {block_type} block; expected closing marker",
            error_type=ParseErrorType.UNCLOSED_BLOCK,
            guidance=f"Block opened at L{start_line}; add closing marker",
        )

    @classmethod
    def undefined_reference(cls, line: int, column: int, ref_type: str, ref_name: str, available: list[str]) -> "ParseError":
        """Create error for reference to undefined entity."""
        avail_str = ', '.join(available) if available else 'none defined'
        return cls(
            line=line,
            column=column,
            message=f"{ref_type} '{ref_name}' not found; available: [{avail_str}]",
            error_type=ParseErrorType.UNDEFINED_REFERENCE,
            guidance=f"Define '{ref_name}' or use an existing {ref_type.lower()}",
        )

    @classmethod
    def unexpected_token(cls, line: int, column: int, found: str, expected: str) -> "ParseError":
        """Create error for unexpected token."""
        return cls(
            line=line,
            column=column,
            message=f"Unexpected '{found}', expected {expected}",
            error_type=ParseErrorType.UNEXPECTED_TOKEN,
        )


class ParseErrorCollection:
    """Collection of parse errors with helper methods."""

    def __init__(self):
        self._errors: list[ParseError] = []

    def add(self, error: ParseError) -> None:
        """Add an error to the collection."""
        self._errors.append(error)

    def add_all(self, errors: list[ParseError]) -> None:
        """Add multiple errors to the collection."""
        self._errors.extend(errors)

    @property
    def errors(self) -> list[ParseError]:
        """Get all errors."""
        return self._errors

    @property
    def has_errors(self) -> bool:
        """Check if there are any errors."""
        return any(e.severity == ErrorSeverity.ERROR for e in self._errors)

    @property
    def error_count(self) -> int:
        """Count of errors (not warnings)."""
        return sum(1 for e in self._errors if e.severity == ErrorSeverity.ERROR)

    @property
    def warning_count(self) -> int:
        """Count of warnings."""
        return sum(1 for e in self._errors if e.severity == ErrorSeverity.WARNING)

    def get_errors_at_line(self, line: int) -> list[ParseError]:
        """Get all errors at a specific line."""
        return [e for e in self._errors if e.line == line]

    def to_list(self) -> list[dict]:
        """Convert all errors to list of dicts."""
        return [e.to_dict() for e in self._errors]

    def __len__(self) -> int:
        return len(self._errors)

    def __iter__(self):
        return iter(self._errors)
