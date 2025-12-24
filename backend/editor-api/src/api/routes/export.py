"""
T016: POST /export endpoint for exporting to OpenAPI.

Exports DSL content to OpenAPI 3.0 or 3.1 specifications.
Supports YAML and JSON output formats.

Feature 003 - Natural Language DSL & OpenAPI Export.
"""

from enum import Enum
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Literal

from ...services.export_service import ExportService


router = APIRouter(prefix="/export", tags=["export"])


class ExportFormat(str, Enum):
    """Supported export formats."""
    yaml = "yaml"
    json = "json"


class OpenAPIVersion(str, Enum):
    """Supported OpenAPI versions."""
    v30 = "3.0"
    v31 = "3.1"


class ExportRequest(BaseModel):
    """Request body for export endpoint."""
    content: str = Field(..., description="DSL content to export")
    format: ExportFormat = Field(
        default=ExportFormat.yaml,
        description="Output format (yaml or json)"
    )
    version: OpenAPIVersion = Field(
        default=OpenAPIVersion.v30,
        description="OpenAPI version (3.0 or 3.1)"
    )


# Create singleton service instance
_export_service: ExportService | None = None


def get_export_service() -> ExportService:
    """Get or create export service singleton."""
    global _export_service
    if _export_service is None:
        _export_service = ExportService()
    return _export_service


@router.post(
    "",
    summary="Export DSL to OpenAPI",
    description="Exports DSL content to OpenAPI specification in YAML or JSON format.",
    responses={
        200: {
            "description": "OpenAPI specification",
            "content": {
                "application/x-yaml": {"example": "openapi: '3.0.3'\ninfo:..."},
                "application/json": {"example": {"openapi": "3.0.3", "info": "..."}},
            }
        },
        422: {"description": "Validation error - invalid format or version"},
        500: {"description": "Export failed"},
    }
)
async def export_openapi(request: ExportRequest) -> Response:
    """
    Export DSL content to OpenAPI specification.

    Args:
        request: Export request with content, format, and version

    Returns:
        Response with OpenAPI spec in requested format
    """
    export_service = get_export_service()

    try:
        # Export the content
        result = export_service.export_openapi(
            content=request.content,
            format=request.format.value,
            version=request.version.value
        )

        # Get appropriate content type
        content_type = export_service.get_content_type(request.format.value)

        return Response(
            content=result,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=openapi.{request.format.value}"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )
