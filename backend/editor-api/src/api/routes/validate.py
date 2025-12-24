"""
Validation API routes.

T049: Provides POST /validate endpoint for DSL content validation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from src.services.validation_service import get_validation_service


router = APIRouter(prefix="/validate", tags=["Validation"])


class ValidateRequest(BaseModel):
    """Request body for validation endpoint."""

    content: str = Field(
        ...,
        description="DSL content to validate",
        examples=["# Service: Test API\nversion: 1.0.0"],
    )


class ValidationError(BaseModel):
    """Individual validation error."""

    line: int = Field(..., description="Line number where error occurred")
    column: int = Field(..., description="Column number where error occurred")
    message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error")
    severity: str = Field(..., description="Error severity (error or warning)")
    guidance: str | None = Field(None, description="Guidance for fixing the error")


class ValidateResponse(BaseModel):
    """Response body for validation endpoint."""

    valid: bool = Field(..., description="Whether the content is valid")
    errors: list[ValidationError] = Field(
        default_factory=list,
        description="List of validation errors"
    )
    error_count: int = Field(..., description="Number of errors")
    warning_count: int = Field(..., description="Number of warnings")


@router.post(
    "",
    response_model=ValidateResponse,
    summary="Validate DSL content",
    description="Validates DSL content and returns validation results with any errors found.",
)
async def validate_content(request: ValidateRequest) -> ValidateResponse:
    """
    Validate DSL content.

    Parses and validates the provided DSL content, returning any syntax
    or semantic errors found.

    Args:
        request: Request containing DSL content to validate

    Returns:
        ValidationResult with is_valid flag and any errors
    """
    service = get_validation_service()
    result = service.validate(request.content)

    return ValidateResponse(
        valid=result["valid"],
        errors=[ValidationError(**e) for e in result["errors"]],
        error_count=result["error_count"],
        warning_count=result["warning_count"],
    )
