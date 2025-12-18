"""
T062: POST /parse endpoint for parsing DSL content.

Returns structured ParsedRequirements with:
- Services, Models, Operations, Errors
- Source locations for bidirectional selection
- Parse errors for invalid sections
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Optional

from ...services.parser_service import get_parser_service


router = APIRouter(prefix="/parse", tags=["parse"])


class ParseRequest(BaseModel):
    """Request body for parse endpoint."""
    content: str = Field(..., description="DSL content to parse")


class FieldSchema(BaseModel):
    """Field definition within a model."""
    name: str
    type: str
    required: bool
    description: Optional[str] = None
    constraints: dict = Field(default_factory=dict)
    location: dict = Field(default_factory=dict)


class ModelSchema(BaseModel):
    """Model entity schema."""
    name: str
    description: Optional[str] = None
    fields: list[FieldSchema] = Field(default_factory=list)
    location: dict = Field(default_factory=dict)


class OperationSchema(BaseModel):
    """Operation entity schema."""
    method: str
    path: str
    summary: Optional[str] = None
    description: Optional[str] = None
    request_model: Optional[str] = None
    response_model: Optional[str] = None
    error_refs: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    location: dict = Field(default_factory=dict)


class ServiceSchema(BaseModel):
    """Service entity schema."""
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    version: str = "1.0.0"
    base_path: str = "/api"
    operations: list[OperationSchema] = Field(default_factory=list)
    location: dict = Field(default_factory=dict)


class ErrorSchema(BaseModel):
    """Error entity schema."""
    status_code: int
    name: str
    description: Optional[str] = None
    message: Optional[str] = None
    location: dict = Field(default_factory=dict)


class ParseErrorSchema(BaseModel):
    """Parse error schema."""
    line: int
    column: int
    message: str
    error_type: str


class ParseResponse(BaseModel):
    """Response body for parse endpoint."""
    services: list[ServiceSchema] = Field(default_factory=list)
    models: list[ModelSchema] = Field(default_factory=list)
    operations: list[OperationSchema] = Field(default_factory=list)
    errors: list[ErrorSchema] = Field(default_factory=list)
    parse_errors: list[ParseErrorSchema] = Field(default_factory=list)
    valid_entities: int = 0
    total_errors: int = 0


@router.post("", response_model=ParseResponse)
async def parse_content(request: ParseRequest) -> ParseResponse:
    """
    Parse DSL content and return structured entities.

    Returns all parsed entities (services, models, operations, errors)
    with source locations for bidirectional selection in the editor.
    Also returns any parse errors encountered.
    """
    parser = get_parser_service()
    result = parser.parse(request.content)

    return ParseResponse(
        services=[ServiceSchema(**s) for s in result.get("services", [])],
        models=[ModelSchema(**m) for m in result.get("models", [])],
        operations=[OperationSchema(**o) for o in result.get("operations", [])],
        errors=[ErrorSchema(**e) for e in result.get("errors", [])],
        parse_errors=[ParseErrorSchema(**p) for p in result.get("parse_errors", [])],
        valid_entities=result.get("valid_entities", 0),
        total_errors=result.get("total_errors", 0),
    )
