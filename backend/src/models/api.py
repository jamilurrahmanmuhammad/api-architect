"""API response envelope models.

T016: GREEN - API response envelope models (ApiResponse, ApiError, ApiMeta).
"""

from datetime import UTC, datetime
from typing import Generic, TypeVar
from uuid import uuid4

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiMeta(BaseModel):
    """Response metadata included in all API responses."""

    request_id: str = Field(
        default_factory=lambda: str(uuid4()),
        alias="requestId",
        description="Request correlation ID",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Response timestamp",
    )

    model_config = {"populate_by_name": True}


class ApiResponse(BaseModel, Generic[T]):
    """Standard API success response envelope."""

    data: T
    meta: ApiMeta = Field(default_factory=ApiMeta)


class ApiError(BaseModel):
    """Error information for API error responses."""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: dict | None = Field(default=None, description="Additional error context")


class ApiErrorResponse(BaseModel):
    """Standard API error response envelope."""

    error: ApiError
    meta: ApiMeta = Field(default_factory=ApiMeta)
