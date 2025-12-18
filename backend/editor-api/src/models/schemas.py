"""
Pydantic request/response schemas for API Architect Editor API.

Provides validated data models for:
- API request payload validation
- API response serialization
- OpenAPI documentation generation
- Type hints and IDE autocompletion

All models inherit from ConfigDict with json_schema_extra for OpenAPI docs.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# File Management Schemas
# ============================================================================


class RequirementFileCreateRequest(BaseModel):
    """Request payload for creating a new requirement file."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="File name (e.g., 'petstore-api')",
        example="petstore-api",
    )
    content: str = Field(
        default="",
        description="Initial DSL content (can be empty)",
        example="## Service\nname: petstore\ntitle: Petstore API",
    )

    model_config = ConfigDict(json_schema_extra={"example": {"name": "api-spec", "content": ""}})


class RequirementFileUpdateRequest(BaseModel):
    """Request payload for updating a requirement file."""

    content: str = Field(
        ...,
        description="Updated DSL content",
        example="## Service\nname: petstore\ntitle: Petstore API",
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"content": "## Service\nname: petstore"}}
    )


class RequirementFileResponse(BaseModel):
    """Response payload for requirement file data."""

    id: UUID = Field(..., description="File unique identifier")
    name: str = Field(..., description="File name")
    content: str = Field(..., description="DSL source content")
    version: int = Field(..., description="Auto-incrementing version number")
    status: str = Field(
        default="draft",
        description="File status (draft, reviewing, approved, published)",
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_by: Optional[UUID] = Field(None, description="User who created the file")

    model_config = ConfigDict(from_attributes=True)


class RequirementFileListResponse(BaseModel):
    """Response payload for file listing with pagination."""

    files: list[RequirementFileResponse] = Field(..., description="List of files")
    total: int = Field(..., description="Total number of files")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=10, description="Items per page")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "files": [],
                "total": 42,
                "page": 1,
                "page_size": 10,
            }
        }
    )


# ============================================================================
# DSL Parsing & Validation Schemas
# ============================================================================


class ParseError(BaseModel):
    """Single parse/validation error with location info."""

    line: int = Field(..., description="Line number where error occurred (1-indexed)")
    column: int = Field(
        default=0, description="Column number where error occurred (1-indexed)"
    )
    error_type: str = Field(
        ...,
        description="Error type (MISSING_HEADER, INVALID_NESTING, DUPLICATE_ENTITY, etc.)",
    )
    message: str = Field(..., description="Human-readable error message")
    guidance: Optional[str] = Field(
        None, description="Suggested fix or next steps"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "line": 5,
                "column": 1,
                "error_type": "MISSING_HEADER",
                "message": "Expected '## Service' or '## Model' header",
                "guidance": "Add '## Service' header before service definition",
            }
        }
    )


class EntityField(BaseModel):
    """Field definition within a Model entity."""

    name: str = Field(..., description="Field name")
    type: str = Field(
        ...,
        description="Field type (string, number, boolean, object, array, etc.)",
    )
    required: bool = Field(default=True, description="Whether field is required")
    description: Optional[str] = Field(None, description="Field description")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "id",
                "type": "integer",
                "required": True,
                "description": "Unique identifier",
            }
        }
    )


class ParsedService(BaseModel):
    """Parsed Service entity from DSL."""

    id: str = Field(..., description="Service identifier")
    name: str = Field(..., description="Service name")
    title: Optional[str] = Field(None, description="Human-readable title")
    description: Optional[str] = Field(None, description="Service description")
    version: Optional[str] = Field(default="1.0.0", description="API version")
    base_path: Optional[str] = Field(default="/api", description="API base path")


class ParsedModel(BaseModel):
    """Parsed Model entity from DSL."""

    id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Model name")
    description: Optional[str] = Field(None, description="Model description")
    fields: list[EntityField] = Field(default=[], description="Model fields")


class ParsedOperation(BaseModel):
    """Parsed Operation entity from DSL."""

    id: str = Field(..., description="Operation identifier")
    service_id: str = Field(..., description="Parent service ID")
    method: str = Field(..., description="HTTP method (GET, POST, PUT, DELETE, PATCH)")
    path: str = Field(..., description="API endpoint path")
    summary: Optional[str] = Field(None, description="Operation summary")
    request_model_id: Optional[str] = Field(None, description="Request model reference")
    response_model_id: Optional[str] = Field(None, description="Response model reference")
    error_refs: list[str] = Field(default=[], description="Referenced error IDs")


class ParsedError(BaseModel):
    """Parsed Error entity from DSL."""

    id: str = Field(..., description="Error identifier")
    status_code: int = Field(..., description="HTTP status code")
    name: str = Field(..., description="Error name")
    description: Optional[str] = Field(None, description="Error description")


class ParseRequest(BaseModel):
    """Request payload for DSL parsing."""

    file_id: Optional[UUID] = Field(None, description="File ID (for reference)")
    content: str = Field(..., description="DSL source content to parse")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "## Service\nname: petstore\ntitle: Petstore API\n\n## Model\nname: Pet\nfields:\n  - name: id\n    type: integer"
            }
        }
    )


class ParseResponse(BaseModel):
    """Response payload for successful DSL parse."""

    services: list[ParsedService] = Field(default=[], description="Parsed services")
    models: list[ParsedModel] = Field(default=[], description="Parsed models")
    operations: list[ParsedOperation] = Field(
        default=[], description="Parsed operations"
    )
    errors: list[ParsedError] = Field(default=[], description="Parsed errors")
    parse_errors: list[ParseError] = Field(
        default=[], description="Parse errors found"
    )
    partial: bool = Field(
        default=False,
        description="True if parse succeeded partially (best-effort parsing)",
    )

    model_config = ConfigDict(from_attributes=True)


class ValidateRequest(BaseModel):
    """Request payload for DSL validation."""

    file_id: Optional[UUID] = Field(None, description="File ID (for reference)")
    content: str = Field(..., description="DSL source content to validate")

    model_config = ConfigDict(
        json_schema_extra={"example": {"content": "## Service\nname: petstore"}}
    )


class ValidateResponse(BaseModel):
    """Response payload for validation results."""

    valid: bool = Field(..., description="Whether DSL is valid")
    errors: list[ParseError] = Field(default=[], description="Validation errors")
    warnings: list[ParseError] = Field(default=[], description="Validation warnings")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "valid": False,
                "errors": [
                    {
                        "line": 5,
                        "column": 1,
                        "error_type": "MISSING_HEADER",
                        "message": "Expected '## Service' header",
                    }
                ],
            }
        }
    )


# ============================================================================
# Export Schemas
# ============================================================================


class ExportRequest(BaseModel):
    """Request payload for exporting requirements."""

    file_id: UUID = Field(..., description="File ID to export")
    format: str = Field(
        default="json",
        description="Export format (json or yaml)",
        pattern="^(json|yaml)$",
    )
    include_metadata: bool = Field(
        default=True, description="Include file metadata in export"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "file_id": "550e8400-e29b-41d4-a716-446655440000",
                "format": "json",
                "include_metadata": True,
            }
        }
    )


class ExportMetadata(BaseModel):
    """Metadata about exported file."""

    file_id: UUID = Field(..., description="File ID")
    file_name: str = Field(..., description="Original file name")
    exported_at: datetime = Field(..., description="Export timestamp")
    version: int = Field(..., description="File version at export")
    dsl_version: str = Field(default="1.0", description="DSL version")


class ExportResponse(BaseModel):
    """Response payload for export (base structure)."""

    metadata: Optional[ExportMetadata] = Field(None, description="Export metadata")
    services: list[ParsedService] = Field(default=[], description="Exported services")
    models: list[ParsedModel] = Field(default=[], description="Exported models")
    operations: list[ParsedOperation] = Field(
        default=[], description="Exported operations"
    )
    errors: list[ParsedError] = Field(default=[], description="Exported errors")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Error Response Schemas
# ============================================================================


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str = Field(..., description="Error type")
    detail: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "ValidationError",
                "detail": "File not found",
                "status_code": 404,
            }
        }
    )
