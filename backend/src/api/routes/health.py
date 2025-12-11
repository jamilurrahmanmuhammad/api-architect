"""Health check endpoints.

T015/T118: GREEN - Implement health check and readiness endpoints.
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from src.models.api import ApiResponse
from src.models.health import HealthCheck, HealthStatus

router = APIRouter(prefix="/health", tags=["Health"])

APP_VERSION = "0.1.0"


class ReadinessCheck(BaseModel):
    """Readiness probe response model."""

    status: str = "ready"
    checks: dict[str, dict[str, str]] = {}


@router.get(
    "",
    response_model=ApiResponse[HealthCheck],
    summary="Health check",
    description="Returns the health status of the API service",
)
async def get_health() -> ApiResponse[HealthCheck]:
    """Return the health status of the API service."""
    health_data = HealthCheck(
        status=HealthStatus.HEALTHY,
        version=APP_VERSION,
    )
    return ApiResponse(data=health_data)


@router.get(
    "/ready",
    response_model=ApiResponse[ReadinessCheck],
    summary="Readiness probe",
    description="Returns whether the service is ready to accept requests",
)
async def get_ready() -> ApiResponse[ReadinessCheck]:
    """Return readiness status for Kubernetes probes (T118)."""
    # In a real app, this would check dependencies (DB, cache, etc.)
    checks = {
        "config": {"status": "ok"},
        "modules": {"status": "ok"},
    }

    readiness = ReadinessCheck(status="ready", checks=checks)
    return ApiResponse(data=readiness)
