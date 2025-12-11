# Data Model: Core Framework & Professional Home Page

**Feature**: 001-core-framework-homepage
**Date**: 2025-12-10
**Status**: Complete

## Overview

This document defines the data entities, their relationships, and validation rules for Feature 001. These models support the landing page, dashboard, navigation, theming, and module system.

---

## Entity Diagram

```
┌─────────────────┐     ┌─────────────────┐
│     Module      │     │   UserSession   │
├─────────────────┤     ├─────────────────┤
│ id: string      │     │ id: string      │
│ name: string    │     │ userId: string  │
│ description: str│     │ name: string    │
│ icon: string    │     │ email: string   │
│ route: string   │     │ isAuthenticated │
│ enabled: bool   │     │ preferences     │
│ order: int      │     │ createdAt       │
└─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ NavigationItem  │     │     Theme       │
├─────────────────┤     ├─────────────────┤
│ id: string      │     │ mode: enum      │
│ label: string   │     │ (light/dark/sys)│
│ icon: string    │     └─────────────────┘
│ route: string   │
│ isActive: bool  │
│ moduleId: string│
│ order: int      │
└─────────────────┘
```

---

## 1. Module Entity

Represents an application feature module (Features 2-20 in the system).

### Schema Definition

**TypeScript (Frontend)**:
```typescript
// types/module.ts
export interface Module {
  /** Unique identifier (kebab-case) */
  id: string;

  /** Display name */
  name: string;

  /** Short description (max 200 chars) */
  description: string;

  /** Lucide icon name */
  icon: string;

  /** Navigation route path */
  route: string;

  /** Whether module is enabled */
  enabled: boolean;

  /** Display order (1-indexed) */
  order: number;

  /** Optional badge text (e.g., "New", "Beta") */
  badge?: string;
}

// Validation
export const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const MAX_DESCRIPTION_LENGTH = 200;
```

**Python (Backend)**:
```python
# models/module.py
from pydantic import BaseModel, Field, field_validator
import re

class Module(BaseModel):
    """Application feature module definition."""

    id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        pattern=r"^[a-z][a-z0-9-]*$",
        description="Unique identifier in kebab-case",
        examples=["requirements-studio", "transformation-engine"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name",
        examples=["Requirements Studio"],
    )
    description: str = Field(
        ...,
        max_length=200,
        description="Short description of module purpose",
    )
    icon: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Lucide icon name",
        examples=["FileText", "ArrowLeftRight"],
    )
    route: str = Field(
        ...,
        pattern=r"^/app/[a-z][a-z0-9-/]*$",
        description="Navigation route path",
        examples=["/app/requirements", "/app/transform"],
    )
    enabled: bool = Field(
        default=True,
        description="Whether module is accessible",
    )
    order: int = Field(
        ...,
        ge=1,
        le=100,
        description="Display order in navigation",
    )
    badge: str | None = Field(
        default=None,
        max_length=20,
        description="Optional badge text",
        examples=["New", "Beta"],
    )

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9-]*$", v):
            raise ValueError("ID must be kebab-case starting with a letter")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "id": "requirements-studio",
                "name": "Requirements Studio",
                "description": "Define and manage API requirements in plain text",
                "icon": "FileText",
                "route": "/app/requirements",
                "enabled": True,
                "order": 1,
            }
        }
```

### Requirements Traceability

| Field | Requirements |
|-------|--------------|
| id | FR-016, FR-017 |
| name | FR-018 |
| description | FR-018 |
| icon | FR-018 |
| route | FR-007 |
| enabled | FR-019 |
| order | FR-004, FR-016 |

---

## 2. UserSession Entity

Represents authenticated user state. Initially mocked; designed for swappable provider.

### Schema Definition

**TypeScript (Frontend)**:
```typescript
// types/user.ts
export interface UserPreferences {
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
}

export interface UserSession {
  /** Session ID */
  id: string;

  /** User identifier */
  userId: string;

  /** Display name */
  name: string;

  /** Email address */
  email: string;

  /** Authentication status */
  isAuthenticated: boolean;

  /** User preferences */
  preferences: UserPreferences;

  /** Session creation timestamp */
  createdAt: string;
}

// Mock user for development
export const MOCK_USER: UserSession = {
  id: 'session-001',
  userId: 'user-001',
  name: 'Test User',
  email: 'test@example.com',
  isAuthenticated: true,
  preferences: { theme: 'system' },
  createdAt: new Date().toISOString(),
};
```

**Python (Backend)**:
```python
# models/user.py
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from enum import Enum

class ThemeMode(str, Enum):
    """Theme preference options."""
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"

class UserPreferences(BaseModel):
    """User preference settings."""
    theme: ThemeMode = Field(
        default=ThemeMode.SYSTEM,
        description="UI theme preference",
    )

class UserSession(BaseModel):
    """Authenticated user session."""

    id: str = Field(
        ...,
        description="Session identifier",
    )
    user_id: str = Field(
        ...,
        alias="userId",
        description="User identifier",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name",
    )
    email: EmailStr = Field(
        ...,
        description="Email address",
    )
    is_authenticated: bool = Field(
        default=False,
        alias="isAuthenticated",
        description="Authentication status",
    )
    preferences: UserPreferences = Field(
        default_factory=UserPreferences,
        description="User preferences",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        alias="createdAt",
        description="Session creation timestamp",
    )

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "session-001",
                "userId": "user-001",
                "name": "Test User",
                "email": "test@example.com",
                "isAuthenticated": True,
                "preferences": {"theme": "system"},
                "createdAt": "2025-12-10T00:00:00Z",
            }
        }
```

### Requirements Traceability

| Field | Requirements |
|-------|--------------|
| id | FR-012 |
| userId | FR-012, FR-014 |
| name | FR-014 |
| email | FR-014 |
| isAuthenticated | FR-012, FR-013 |
| preferences.theme | FR-008, FR-009 |

---

## 3. NavigationItem Entity

Represents a navigation entry derived from modules.

### Schema Definition

**TypeScript (Frontend)**:
```typescript
// types/navigation.ts
export interface NavigationItem {
  /** Unique identifier */
  id: string;

  /** Display label */
  label: string;

  /** Lucide icon name */
  icon: string;

  /** Target route */
  route: string;

  /** Whether currently active */
  isActive: boolean;

  /** Parent module ID */
  moduleId: string;

  /** Display order */
  order: number;

  /** Whether disabled (module not enabled) */
  disabled?: boolean;

  /** Tooltip for disabled state */
  disabledReason?: string;
}

// Derived from Module
export function moduleToNavItem(
  module: Module,
  currentPath: string
): NavigationItem {
  return {
    id: `nav-${module.id}`,
    label: module.name,
    icon: module.icon,
    route: module.route,
    isActive: currentPath.startsWith(module.route),
    moduleId: module.id,
    order: module.order,
    disabled: !module.enabled,
    disabledReason: !module.enabled
      ? 'This module is not available'
      : undefined,
  };
}
```

### Requirements Traceability

| Field | Requirements |
|-------|--------------|
| label | FR-004 |
| icon | FR-004 |
| route | FR-007 |
| isActive | FR-005, SC-004 |
| disabled | Edge case: disabled module |

---

## 4. Theme Entity

Represents theme configuration state.

### Schema Definition

**TypeScript (Frontend)**:
```typescript
// types/theme.ts
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  /** Current theme preference */
  mode: ThemeMode;

  /** Resolved theme (after system detection) */
  resolvedTheme: 'light' | 'dark';
}

// Theme resolution logic
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}
```

### Requirements Traceability

| Field | Requirements |
|-------|--------------|
| mode | FR-008 |
| resolvedTheme | FR-010, SC-003 |
| persistence | FR-009 |

---

## 5. API Response Envelopes

### Success Response

```typescript
// types/api.ts
export interface ApiMeta {
  /** Request correlation ID */
  requestId: string;

  /** Response timestamp */
  timestamp: string;
}

export interface ApiResponse<T> {
  /** Response data */
  data: T;

  /** Response metadata */
  meta: ApiMeta;
}
```

```python
# models/api.py
from pydantic import BaseModel, Field
from typing import TypeVar, Generic
from datetime import datetime
from uuid import uuid4

T = TypeVar("T")

class ApiMeta(BaseModel):
    """Response metadata."""
    request_id: str = Field(
        default_factory=lambda: str(uuid4()),
        alias="requestId",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
    )

    class Config:
        populate_by_name = True

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response envelope."""
    data: T
    meta: ApiMeta = Field(default_factory=ApiMeta)
```

### Error Response

```typescript
export interface ApiError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Additional details */
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  /** Error information */
  error: ApiError;

  /** Response metadata */
  meta: ApiMeta;
}
```

```python
# models/api.py (continued)
class ApiError(BaseModel):
    """Error information."""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable message")
    details: dict | None = Field(default=None, description="Additional context")

class ApiErrorResponse(BaseModel):
    """Standard error response envelope."""
    error: ApiError
    meta: ApiMeta = Field(default_factory=ApiMeta)
```

---

## 6. Health Check Response

```python
# models/health.py
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

class HealthCheck(BaseModel):
    """Health check response."""
    status: HealthStatus = Field(
        ...,
        description="Overall health status",
    )
    version: str = Field(
        ...,
        description="Application version",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Check timestamp",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "0.1.0",
                "timestamp": "2025-12-10T00:00:00Z",
            }
        }
```

### Requirements Traceability

| Field | Requirements |
|-------|--------------|
| status | FR-027, SC-010 |
| version | FR-027 |

---

## State Transitions

### Authentication State Machine

```
                    ┌──────────────┐
                    │              │
         ┌──────────│ Unauthenticated │◄────────┐
         │          │              │           │
         │          └──────────────┘           │
         │                 │                   │
         │           login()                   │
         │                 │              logout()
         │                 ▼                   │
         │          ┌──────────────┐           │
         │          │              │           │
         └──────────│ Authenticated │──────────┘
                    │              │
                    └──────────────┘
```

### Theme State Machine

```
         ┌──────────────┐
         │              │
    ┌────│    Light     │◄───┐
    │    │              │    │
    │    └──────────────┘    │
    │           │            │
    │     setTheme('dark')   │
    │           │            │
    │           ▼            │
    │    ┌──────────────┐    │
    │    │              │    │
    ├────│     Dark     │────┤
    │    │              │    │
    │    └──────────────┘    │
    │           │            │
    │   setTheme('system')   │
    │           │            │
    │           ▼            │
    │    ┌──────────────┐    │
    │    │              │    │
    └────│    System    │────┘
         │              │
         └──────────────┘
```

---

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| Module | id | kebab-case, 1-50 chars |
| Module | name | 1-100 chars |
| Module | description | max 200 chars |
| Module | route | starts with `/app/` |
| Module | order | 1-100 |
| UserSession | email | valid email format |
| UserSession | name | 1-100 chars |
| NavigationItem | label | truncate > 30 chars |
| Theme | mode | enum: light, dark, system |
