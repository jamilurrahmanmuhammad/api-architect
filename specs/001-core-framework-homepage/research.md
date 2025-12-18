# Research: Core Framework & Professional Home Page

**Feature**: 001-core-framework-homepage
**Date**: 2025-12-10
**Status**: Complete

## Executive Summary

This document consolidates research findings for technology choices supporting Feature 001. All decisions align with the project constitution and prioritize TDD methodology, CLI automation, and modern best practices.

---

## 1. Frontend Framework

### Decision: React 19 + Vite 6

**Rationale**:
- React 19 offers improved concurrent rendering, automatic batching, and React Server Components foundation
- Vite 6 provides fastest-in-class HMR (~10ms), native ESM support, and excellent TypeScript integration
- Large ecosystem with mature tooling and community support

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Next.js | SSR/SSG built-in | Opinionated, heavier | Overkill for SPA dashboard |
| Remix | Full-stack, great DX | Smaller ecosystem | Less community resources |
| Vue 3 | Simpler learning curve | Smaller talent pool | Team familiarity with React |

**Source**: Context7 docs `/websites/react_dev_reference`, `/vitejs/vite`

---

## 2. State Management

### Decision: Zustand with persist middleware

**Rationale**:
- Minimal boilerplate compared to Redux (~3x less code)
- Built-in persist middleware for localStorage (theme preference - FR-009)
- TypeScript-first with excellent type inference
- No context providers required - direct store subscription

**Implementation Pattern**:
```typescript
// Theme store with persistence
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type ThemeStore = {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: ThemeStore['theme']) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'api-architect-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Redux Toolkit | Industry standard | Heavy boilerplate | Overkill for app complexity |
| Jotai | Atomic, minimal | Less structured | Preference for store pattern |
| React Context | Built-in | Re-render issues, no persist | Performance concerns |

**Source**: Context7 docs `/pmndrs/zustand`

---

## 3. UI Component Library

### Decision: Tailwind CSS 4 + shadcn/ui

**Rationale**:
- Tailwind CSS 4: Native CSS variables, faster compilation, improved dark mode support
- shadcn/ui: Copy-paste model = no version lock-in, full customization control
- Built-in sidebar component matches FR-004 to FR-007 requirements
- Dark mode via class toggle aligns with FR-008 to FR-010

**Dark Mode Implementation**:
```typescript
// Tailwind dark mode with class strategy
// tailwind.config.ts
export default {
  darkMode: 'class', // or 'selector' in v4
  // ...
}

// Toggle implementation
document.documentElement.classList.toggle('dark', theme === 'dark')
```

**Sidebar Pattern** (from shadcn/ui):
```tsx
<Sidebar>
  <SidebarHeader />
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Modules</SidebarGroupLabel>
      <SidebarMenu>
        {modules.map((module) => (
          <SidebarMenuItem key={module.id}>
            <SidebarMenuButton asChild isActive={module.active}>
              <Link to={module.route}>
                <module.icon />
                <span>{module.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter />
</Sidebar>
```

**Alternatives Considered**:
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Chakra UI | Complete, accessible | Bundle size, version lock | Heavier, less flexible |
| Material UI | Google's design system | Opinionated styling | Not aligned with custom design |
| Radix + custom CSS | Maximum flexibility | More work | shadcn already does this |

**Source**: Context7 docs `/websites/tailwindcss`, `/shadcn-ui/ui`

---

## 4. Routing

### Decision: React Router 7

**Rationale**:
- Data loading/mutations built-in (loaders, actions)
- Type-safe routing with TypeScript
- Supports nested layouts (PublicLayout vs AppLayout)
- Largest React routing ecosystem

**Route Structure**:
```typescript
// routes.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'modules/:moduleId', element: <ModulePage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
```

**Source**: Context7 docs `/remix-run/react-router`

---

## 5. Backend Framework

### Decision: FastAPI 0.115+ with Pydantic 2.x

**Rationale**:
- Async-first with excellent performance
- Automatic OpenAPI documentation (supports Constitution Principle VI)
- Native Pydantic integration for request/response validation
- Dependency injection system for testable code

**Testing Pattern (TDD)**:
```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

# test_health.py
@pytest.mark.asyncio
async def test_health_returns_healthy(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "healthy"
```

**Dependency Injection for Auth**:
```python
# Swappable auth dependency (FR-015)
from typing import Annotated
from fastapi import Depends

async def get_current_user_mock() -> User:
    return User(id="mock-user", name="Test User")

# Can be swapped for real implementation
CurrentUser = Annotated[User, Depends(get_current_user_mock)]

@app.get("/api/v1/auth/me")
async def get_me(user: CurrentUser):
    return {"data": user}
```

**Source**: Context7 docs `/fastapi/fastapi`

---

## 6. Testing Strategy

### Decision: Vitest + React Testing Library (Frontend), pytest (Backend)

**Frontend Testing Setup**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
})
```

**MSW for API Mocking**:
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/v1/modules', () => {
    return HttpResponse.json({
      data: [
        { id: 'requirements-studio', name: 'Requirements Studio', enabled: true },
        { id: 'transformation-engine', name: 'Transformation Engine', enabled: true },
      ],
      meta: { requestId: 'test-123', timestamp: new Date().toISOString() },
    })
  }),
]
```

**Backend Testing Setup**:
```python
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --cov=src --cov-report=term-missing"

[tool.coverage.run]
branch = true
source = ["src"]

[tool.coverage.report]
fail_under = 80
```

**Source**: Context7 docs `/vitest-dev/vitest`, `/websites/testing-library`, `/pytest-dev/pytest`

---

## 7. Observability

### Decision: structlog (Python) + browser console (Frontend)

**Rationale**:
- structlog provides structured JSON logging for centralized collection (FR-024)
- Correlation IDs via middleware (FR-026)
- Health endpoints with standard format (FR-027)

**Logging Middleware**:
```python
import structlog
from uuid import uuid4
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)

        logger.info("request_started", path=request.url.path, method=request.method)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info("request_completed", status_code=response.status_code)

        return response
```

---

## 8. Module System Design

### Decision: Configuration-driven with YAML

**Rationale**:
- Supports FR-016 to FR-019 (pluggable modules without code changes)
- YAML is human-readable and version-controllable
- Hot-reload possible during development

**Module Configuration**:
```yaml
# config/modules.yaml
modules:
  - id: requirements-studio
    name: Requirements Studio
    description: Define and manage API requirements
    icon: FileText
    route: /app/requirements
    enabled: true
    order: 1

  - id: transformation-engine
    name: Transformation Engine
    description: Transform specifications between formats
    icon: ArrowLeftRight
    route: /app/transform
    enabled: true
    order: 2

  - id: documentation-generator
    name: Documentation Generator
    description: Generate professional API documentation
    icon: BookOpen
    route: /app/docs
    enabled: true
    order: 3
```

---

## 9. CLI Automation

### Decision: npm scripts + Python CLI tools

**Frontend CLI Commands**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit"
  }
}
```

**Backend CLI Commands**:
```toml
# pyproject.toml
[project.scripts]
api-serve = "src.api.main:run_server"
api-test = "pytest:main"

[tool.taskipy.tasks]
dev = "uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000"
test = "pytest"
test-cov = "pytest --cov=src --cov-report=html"
lint = "ruff check src tests"
format = "ruff format src tests"
type-check = "mypy src"
```

---

## 10. Docker Configuration

### Decision: Multi-stage builds with docker-compose

**Development Setup**:
```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
      target: development
    ports:
      - "8000:8000"
    volumes:
      - ../backend/src:/app/src
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ../frontend/src:/app/src
    depends_on:
      - backend
```

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Frontend Framework | React 19 + Vite 6 | Fast DX, modern features |
| State Management | Zustand + persist | Simple, TypeScript-native |
| UI Library | Tailwind + shadcn/ui | Customizable, no lock-in |
| Routing | React Router 7 | Type-safe, data loading |
| Backend | FastAPI + Pydantic | Async, auto-docs |
| Testing | Vitest + pytest | Fast, TDD-friendly |
| Observability | structlog | Structured, correlation IDs |
| Module System | YAML config | Pluggable without code |
| CLI | npm + taskipy | Automated workflows |
| Containers | Docker Compose | Reproducible environments |

---

## References

- React Documentation: https://react.dev
- Vite Documentation: https://vite.dev
- Zustand: https://zustand.docs.pmnd.rs
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com
- FastAPI: https://fastapi.tiangolo.com
- Vitest: https://vitest.dev
- React Testing Library: https://testing-library.com
- pytest: https://docs.pytest.org
