"""Modules API endpoints."""

import uuid
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from src.models.module import Module
from src.services.module_service import get_module_service

router = APIRouter(prefix="/modules", tags=["modules"])


def _create_meta() -> dict:
    """Create response metadata."""
    return {
        "requestId": str(uuid.uuid4()),
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("")
async def list_modules(
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
) -> dict:
    """List all modules.

    Args:
        enabled: Optional filter for enabled/disabled modules.

    Returns:
        List of modules wrapped in API envelope.
    """
    service = get_module_service()
    modules = service.list_modules(enabled_only=enabled)

    return {
        "data": [m.model_dump() for m in modules],
        "meta": _create_meta(),
    }


@router.get("/{module_id}")
async def get_module(module_id: str) -> dict:
    """Get a single module by ID.

    Args:
        module_id: The module identifier.

    Returns:
        Module wrapped in API envelope.

    Raises:
        HTTPException: 404 if module not found.
    """
    service = get_module_service()
    module: Optional[Module] = service.get_module(module_id)

    if module is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Module '{module_id}' not found",
                },
                "meta": _create_meta(),
            },
        )

    return {
        "data": module.model_dump(),
        "meta": _create_meta(),
    }
