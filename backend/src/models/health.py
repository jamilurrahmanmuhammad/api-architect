"""Health check models.

T017: GREEN - Health check models (HealthStatus, HealthCheck).
"""

from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field


class HealthStatus(str, Enum):
    """Health status indicator."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthCheck(BaseModel):
    """Health check response data."""

    status: HealthStatus = Field(
        ...,
        description="Overall health status",
    )
    version: str = Field(
        ...,
        description="Application version",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Check timestamp",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "version": "0.1.0",
                "timestamp": "2025-12-10T00:00:00Z",
            }
        }
    }
