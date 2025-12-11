# Implementation Plan: Core Framework & Professional Home Page

**Branch**: `001-core-framework-homepage` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-framework-homepage/spec.md`

## Summary

Establish the foundational framework for the API Architect application including a public landing page, authenticated dashboard, persistent sidebar navigation, theme switching (light/dark), pluggable module system, and authentication shell. The implementation follows TDD methodology with React 19 + Vite frontend and Python 3.12 + FastAPI backend, using Tailwind CSS + shadcn/ui for styling and Zustand for state management.

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.x, React 19, Node.js 20 LTS
- Backend: Python 3.12, FastAPI 0.115+

**Primary Dependencies**:
- Frontend: React 19, Vite 6, React Router 7, Zustand, Tailwind CSS 4, shadcn/ui
- Backend: FastAPI, Pydantic 2.x, uvicorn, structlog
- Testing: Vitest + React Testing Library (frontend), pytest + httpx (backend)

**Storage**:
- Theme preference: localStorage (browser)
- Module configuration: JSON/YAML files (backend)
- Session state: In-memory (mocked auth for this feature)

**Testing**:
- Frontend: Vitest with jsdom, React Testing Library, MSW for API mocking
- Backend: pytest with pytest-asyncio, httpx TestClient, pytest-cov

**Target Platform**:
- Web browser (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Backend: Linux containers (Docker)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Landing page load: < 3 seconds (Success Criteria SC-001)
- Navigation to any module: < 2 clicks (SC-002)
- Theme switch: < 100ms, no page reload (SC-003)
- Health check response: < 200ms (SC-010)

**Constraints**:
- Responsive: 320px to 2560px viewport width (SC-006)
- Accessibility: WCAG 2.1 AA compliance
- Zero runtime errors in production

**Scale/Scope**:
- Initial: Single-user development
- Future: Multi-tenant SaaS (designed for extensibility)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Text-First Authoring | ✅ PASS | N/A for this feature (UI framework) |
| II. Multi-Format Output | ✅ PASS | N/A for this feature (UI framework) |
| III. CIR | ✅ PASS | N/A for this feature (UI framework) |
| IV. Transformation Fidelity | ✅ PASS | N/A for this feature (UI framework) |
| V. Bidirectional Traceability | ✅ PASS | Requirements traced via FR-xxx IDs |
| VI. Standards Compliance | ✅ PASS | Using established standards (OpenAPI for contracts) |
| VII. Security by Design | ✅ PASS | Auth shell designed for OAuth2/OIDC swap; no secrets in code |
| VIII. RESTful Design | ✅ PASS | API follows REST conventions |
| IX. Comprehensive Documentation | ✅ PASS | Spec, plan, contracts documented |
| X. Testing Artefact Generation | ✅ PASS | TDD approach with comprehensive test coverage |
| XI. User Control & Overrides | ✅ PASS | Theme preference, module config are user-controllable |
| XII. Extensibility Architecture | ✅ PASS | Plugin-based module system design |
| XIII. Implementation Principles | ✅ PASS | API-first, cloud-native, CI/CD ready, observability built-in |

**Gate Result**: ✅ PASS - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-framework-homepage/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer setup guide
├── checklists/          # Requirements checklist
│   └── requirements.md
├── contracts/           # API contracts
│   ├── openapi.yaml     # OpenAPI 3.1 specification
│   └── README.md        # Contract documentation
└── tasks.md             # Implementation tasks (from /sp.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── health.py        # Health check endpoints
│   │   │   ├── modules.py       # Module configuration endpoints
│   │   │   └── auth.py          # Auth shell endpoints (mocked)
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── logging.py       # Structured logging middleware
│   │       └── error_handler.py # Global error handling
│   ├── models/
│   │   ├── __init__.py
│   │   ├── module.py            # Module entity
│   │   └── user.py              # User session entity
│   ├── services/
│   │   ├── __init__.py
│   │   ├── module_service.py    # Module configuration service
│   │   └── auth_service.py      # Auth service (mocked)
│   └── config/
│       ├── __init__.py
│       ├── settings.py          # Application settings
│       └── modules.yaml         # Module definitions
├── tests/
│   ├── conftest.py              # Shared fixtures
│   ├── unit/
│   │   ├── test_module_service.py
│   │   └── test_auth_service.py
│   ├── integration/
│   │   ├── test_health_api.py
│   │   ├── test_modules_api.py
│   │   └── test_auth_api.py
│   └── contract/
│       └── test_openapi_compliance.py
├── pyproject.toml
├── Dockerfile
└── README.md

frontend/
├── src/
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Root component with providers
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── sidebar.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Authenticated layout with sidebar
│   │   │   ├── PublicLayout.tsx # Public pages layout
│   │   │   ├── Header.tsx       # Header with auth status
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── Footer.tsx
│   │   ├── modules/
│   │   │   ├── ModuleCard.tsx   # Dashboard module card
│   │   │   └── ModuleGrid.tsx   # Module cards container
│   │   └── common/
│   │       ├── ThemeToggle.tsx  # Light/dark toggle
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx      # Public landing page
│   │   ├── Dashboard.tsx        # Authenticated dashboard
│   │   ├── LoginPage.tsx        # Login interface (mocked)
│   │   └── NotFound.tsx         # 404 page
│   ├── stores/
│   │   ├── authStore.ts         # Authentication state (Zustand)
│   │   ├── themeStore.ts        # Theme preference (Zustand + persist)
│   │   └── moduleStore.ts       # Module configuration state
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth hook
│   │   ├── useTheme.ts          # Theme hook
│   │   └── useModules.ts        # Modules data hook
│   ├── services/
│   │   ├── api.ts               # API client base
│   │   ├── authService.ts       # Auth API calls
│   │   └── moduleService.ts     # Module API calls
│   ├── types/
│   │   ├── module.ts            # Module types
│   │   ├── user.ts              # User types
│   │   └── api.ts               # API response types
│   ├── lib/
│   │   ├── utils.ts             # Utility functions
│   │   └── cn.ts                # Class name merger
│   └── styles/
│       └── globals.css          # Tailwind + custom CSS
├── tests/
│   ├── setup.ts                 # Test setup (vitest)
│   ├── mocks/
│   │   ├── handlers.ts          # MSW request handlers
│   │   └── server.ts            # MSW server setup
│   ├── unit/
│   │   ├── stores/
│   │   │   ├── authStore.test.ts
│   │   │   ├── themeStore.test.ts
│   │   │   └── moduleStore.test.ts
│   │   └── components/
│   │       ├── ThemeToggle.test.tsx
│   │       ├── ModuleCard.test.tsx
│   │       └── Sidebar.test.tsx
│   └── integration/
│       ├── LandingPage.test.tsx
│       ├── Dashboard.test.tsx
│       └── Navigation.test.tsx
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md

docker/
├── docker-compose.yml           # Local development setup
├── docker-compose.test.yml      # Test environment
└── .env.example                 # Environment template
```

**Structure Decision**: Web application structure selected based on specification indicating React frontend with Python/FastAPI backend. Separation allows independent scaling, deployment, and technology evolution per Constitution Principle XIII.

## Complexity Tracking

> **No violations - standard web application architecture**

| Aspect | Justification |
|--------|---------------|
| Two projects (frontend/backend) | Required by spec; follows microservices principle |
| Zustand for state | Simpler than Redux; sufficient for current scope |
| shadcn/ui components | Copy-paste model avoids dependency bloat |
| Mocked auth | Spec explicitly requires swappable auth provider |

## TDD Strategy

### Red-Green-Refactor Cycle

1. **Red**: Write failing test first based on acceptance criteria
2. **Green**: Implement minimum code to pass test
3. **Refactor**: Clean up while keeping tests green

### Test Categories

| Category | Frontend | Backend | Coverage Target |
|----------|----------|---------|-----------------|
| Unit | Stores, utils, pure components | Services, models | 90% |
| Integration | Page renders, user flows | API endpoints | 80% |
| Contract | N/A | OpenAPI compliance | 100% |
| E2E | Critical paths (future) | N/A | Key flows |

### Testing Tools & Patterns

**Frontend (Vitest + React Testing Library)**:
```typescript
// Example: TDD for ThemeToggle
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('should toggle between light and dark modes', async () => {
    // Arrange
    render(<ThemeToggle />)

    // Act
    const toggle = screen.getByRole('button', { name: /toggle theme/i })
    fireEvent.click(toggle)

    // Assert
    expect(document.documentElement).toHaveClass('dark')
  })
})
```

**Backend (pytest + httpx)**:
```python
# Example: TDD for health endpoint
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_returns_ok(client: AsyncClient):
    # Act
    response = await client.get("/api/v1/health")

    # Assert
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

## API Design (Preview)

### Endpoints Overview

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/health` | Health check | No |
| GET | `/api/v1/health/ready` | Readiness probe | No |
| GET | `/api/v1/modules` | List all modules | Yes |
| GET | `/api/v1/modules/{id}` | Get module by ID | Yes |
| GET | `/api/v1/auth/me` | Current user info | Yes |
| POST | `/api/v1/auth/login` | Mock login | No |
| POST | `/api/v1/auth/logout` | Logout | Yes |

### Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

## Next Steps

1. ✅ Technical Context defined
2. ✅ Constitution Check passed
3. ✅ Generate `research.md` (Phase 0)
4. ✅ Generate `data-model.md` (Phase 1)
5. ✅ Generate `contracts/` (Phase 1)
6. ✅ Generate `quickstart.md` (Phase 1)
7. ✅ Run `/sp.tasks` (Phase 2) - Generated 125 TDD tasks across 8 phases
8. → Run `/sp.implement` (Phase 3) - Execute implementation tasks
