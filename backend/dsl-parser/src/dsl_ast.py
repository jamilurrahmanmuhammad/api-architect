"""
Abstract Syntax Tree (AST) node classes for DSL Parser.

Defines the structured representation of parsed DSL entities:
- ServiceNode: API service definition
- ModelNode: Data structure definition
- FieldNode: Model field definition
- OperationNode: API operation/endpoint
- ErrorNode: Error response definition
- ParsedRequirements: Container for all parsed entities

Each node tracks its source location (line, column) for error reporting
and bidirectional selection in the editor.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class HTTPMethod(Enum):
    """Supported HTTP methods for operations."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class FieldType(Enum):
    """Supported field types for models."""
    STRING = "string"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


@dataclass
class SourceLocation:
    """Source location for AST nodes (for error reporting and editor selection)."""
    line: int
    column: int
    end_line: Optional[int] = None
    end_column: Optional[int] = None

    def __str__(self) -> str:
        if self.end_line and self.end_column:
            return f"L{self.line}:{self.column}-L{self.end_line}:{self.end_column}"
        return f"L{self.line}:{self.column}"


@dataclass
class ASTNode:
    """Base class for all AST nodes."""
    location: SourceLocation

    def to_dict(self) -> dict:
        """Convert node to dictionary for JSON serialization."""
        raise NotImplementedError


@dataclass
class FieldNode(ASTNode):
    """
    Field definition within a model.

    Example DSL:
        | name | string | required | User's full name |
    """
    name: str
    field_type: str
    required: bool = True
    description: Optional[str] = None
    constraints: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.field_type,
            "required": self.required,
            "description": self.description,
            "constraints": self.constraints,
            "location": {
                "line": self.location.line,
                "column": self.location.column,
            }
        }


@dataclass
class ModelNode(ASTNode):
    """
    Model (data structure) definition.

    Example DSL:
        ## Model: Pet
        A pet in the store.

        | name | type | required | description |
        |------|------|----------|-------------|
        | id | integer | true | Unique identifier |
        | name | string | true | Pet's name |
    """
    name: str
    description: Optional[str] = None
    fields: list[FieldNode] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "fields": [f.to_dict() for f in self.fields],
            "location": {
                "line": self.location.line,
                "column": self.location.column,
            }
        }


@dataclass
class OperationNode(ASTNode):
    """
    API operation/endpoint definition.

    Example DSL:
        ## Operation: GET /pets
        List all pets in the store.

        **Request**: None
        **Response**: Pet[]
        **Errors**: 404 NotFound, 500 InternalError
    """
    method: str
    path: str
    summary: Optional[str] = None
    description: Optional[str] = None
    request_model: Optional[str] = None
    response_model: Optional[str] = None
    error_refs: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "method": self.method,
            "path": self.path,
            "summary": self.summary,
            "description": self.description,
            "request_model": self.request_model,
            "response_model": self.response_model,
            "error_refs": self.error_refs,
            "tags": self.tags,
            "location": {
                "line": self.location.line,
                "column": self.location.column,
            }
        }


@dataclass
class ErrorNode(ASTNode):
    """
    Error response definition.

    Example DSL:
        ## Error: 404 NotFound
        The requested resource was not found.
    """
    status_code: int
    name: str
    description: Optional[str] = None
    message: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "status_code": self.status_code,
            "name": self.name,
            "description": self.description,
            "message": self.message,
            "location": {
                "line": self.location.line,
                "column": self.location.column,
            }
        }


@dataclass
class ServiceNode(ASTNode):
    """
    API service definition (top-level container).

    Example DSL:
        # Service: Petstore API
        version: 1.0.0
        base_path: /api/v1

        A sample Pet Store API.
    """
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    version: str = "1.0.0"
    base_path: str = "/api"
    operations: list[OperationNode] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "version": self.version,
            "base_path": self.base_path,
            "operations": [op.to_dict() for op in self.operations],
            "location": {
                "line": self.location.line,
                "column": self.location.column,
            }
        }


@dataclass
class ParsedRequirements:
    """
    Container for all parsed entities from a DSL file.

    This is the top-level result of parsing a requirements file.
    """
    services: list[ServiceNode] = field(default_factory=list)
    models: list[ModelNode] = field(default_factory=list)
    operations: list[OperationNode] = field(default_factory=list)
    errors: list[ErrorNode] = field(default_factory=list)
    parse_errors: list = field(default_factory=list)  # List of ParseError

    def to_dict(self) -> dict:
        return {
            "services": [s.to_dict() for s in self.services],
            "models": [m.to_dict() for m in self.models],
            "operations": [o.to_dict() for o in self.operations],
            "errors": [e.to_dict() for e in self.errors],
            "parse_errors": [
                {
                    "line": err.line,
                    "column": err.column,
                    "message": err.message,
                    "error_type": err.error_type.value if hasattr(err.error_type, 'value') else str(err.error_type),
                }
                for err in self.parse_errors
            ],
            "valid_entities": len(self.services) + len(self.models) + len(self.operations) + len(self.errors),
            "total_errors": len(self.parse_errors),
        }

    @property
    def is_valid(self) -> bool:
        """Check if the parsed requirements have no errors."""
        return len(self.parse_errors) == 0

    @property
    def entity_count(self) -> int:
        """Total number of parsed entities."""
        return len(self.services) + len(self.models) + len(self.operations) + len(self.errors)
