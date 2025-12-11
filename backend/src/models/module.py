"""Module Pydantic models per data-model.md.

T048: GREEN - Module model definitions.
"""

from typing import Optional

from pydantic import BaseModel, Field


class Module(BaseModel):
    """Module entity representing an application module.

    Attributes per data-model.md:
    - id: kebab-case unique identifier
    - name: Display name (max 50 chars)
    - description: Module description (max 200 chars)
    - icon: Lucide icon name
    - route: Frontend route (starts with /app/)
    - enabled: Whether module is active
    - order: Display order (1-100)
    - badge: Optional badge text
    """

    id: str = Field(
        ..., pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", description="Kebab-case identifier"
    )
    name: str = Field(..., max_length=50, description="Display name")
    description: str = Field(..., max_length=200, description="Module description")
    icon: str = Field(..., description="Lucide icon name")
    route: str = Field(..., pattern=r"^/app/.*", description="Frontend route")
    enabled: bool = Field(default=True, description="Whether module is active")
    order: int = Field(..., ge=1, le=100, description="Display order")
    badge: Optional[str] = Field(default=None, max_length=20, description="Badge text")


class ModuleListResponse(BaseModel):
    """Response model for module list endpoint."""

    data: list[Module]
    meta: dict


class ModuleResponse(BaseModel):
    """Response model for single module endpoint."""

    data: Module
    meta: dict
