# Tasks: Core Framework & Professional Home Page

**Input**: Design documents from `/specs/001-core-framework-homepage/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Branch**: `001-core-framework-homepage`
**TDD Approach**: Tests written FIRST, must FAIL before implementation (Red → Green → Refactor)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and base structure

- [x] T001 Create project directory structure per plan.md (`backend/`, `frontend/`, `docker/`)
- [x] T002 [P] Initialize backend Python project with `pyproject.toml` (FastAPI, Pydantic, pytest, httpx, structlog, ruff)
- [x] T003 [P] Initialize frontend TypeScript project with `package.json` (React 19, Vite 6, Vitest, RTL, Tailwind 4, Zustand)
- [x] T004 [P] Configure backend linting and formatting in `backend/pyproject.toml` (ruff, mypy)
- [x] T005 [P] Configure frontend linting and formatting (`frontend/eslint.config.js`, `frontend/.prettierrc`)
- [x] T006 [P] Create Vitest configuration in `frontend/vitest.config.ts` with jsdom, coverage thresholds (80%)
- [x] T007 [P] Create pytest configuration in `backend/pyproject.toml` with asyncio mode, coverage (80%)
- [x] T008 [P] Setup Tailwind CSS 4 with dark mode class strategy in `frontend/tailwind.config.ts`
- [x] T009 [P] Initialize shadcn/ui in frontend with `frontend/components.json`
- [x] T010 Create environment configuration templates (`backend/.env.example`, `frontend/.env.example`)
- [x] T011 [P] Create Docker Compose for local development in `docker/docker-compose.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [x] T012 RED: Write contract test for health endpoint per OpenAPI spec in `backend/tests/contract/test_openapi_compliance.py`
- [x] T013 RED: Write integration test for GET `/api/v1/health` returning 200 + healthy status in `backend/tests/integration/test_health_api.py`
- [x] T014 GREEN: Create FastAPI app entry point in `backend/src/api/main.py`
- [x] T015 GREEN: Implement health check endpoint in `backend/src/api/routes/health.py`
- [x] T016 [P] Create API response envelope models (ApiResponse, ApiError, ApiMeta) in `backend/src/models/api.py`
- [x] T017 [P] Create health check models (HealthStatus, HealthCheck) in `backend/src/models/health.py`
- [x] T018 Implement structured logging middleware with correlation IDs in `backend/src/api/middleware/logging.py`
- [x] T019 Implement global error handler middleware in `backend/src/api/middleware/error_handler.py`
- [x] T020 Create application settings with Pydantic Settings in `backend/src/config/settings.py`
- [x] T021 REFACTOR: Verify all backend foundation tests pass, coverage meets 80%

### Frontend Foundation

- [x] T022 RED: Write unit test for API client base configuration in `frontend/tests/unit/services/api.test.ts`
- [x] T023 GREEN: Create API client base with fetch wrapper in `frontend/src/services/api.ts`
- [x] T024 [P] Create TypeScript types from data-model.md in `frontend/src/types/` (module.ts, user.ts, api.ts, theme.ts)
- [x] T025 [P] Create utility functions (cn class merger) in `frontend/src/lib/utils.ts`
- [x] T026 Setup MSW handlers for API mocking in `frontend/tests/mocks/handlers.ts`
- [x] T027 Setup MSW server for tests in `frontend/tests/mocks/server.ts`
- [x] T028 Create Vitest setup file with MSW integration in `frontend/tests/setup.ts`
- [x] T029 Create React app entry point with providers in `frontend/src/main.tsx`
- [x] T030 Create root App component with router setup in `frontend/src/App.tsx`
- [x] T031 Setup React Router configuration in `frontend/src/routes.tsx`
- [x] T032 Create global CSS with Tailwind directives in `frontend/src/styles/globals.css`
- [x] T033 REFACTOR: Verify all frontend foundation tests pass

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Product Landing Page (Priority: P1) 🎯 MVP

**Goal**: Public landing page with product name, description, key features, and call-to-action

**Independent Test**: Load `/` URL → See professional landing page with product info within 3 seconds (SC-001)

**Requirements**: FR-001, FR-003, FR-020, FR-021, SC-001, SC-006, SC-007

### Tests for User Story 1 (TDD - Red Phase)

- [x] T034 [P] [US1] RED: Write integration test for landing page rendering product name and description in `frontend/tests/integration/LandingPage.test.tsx`
- [x] T035 [P] [US1] RED: Write test for landing page responsive layout (320px-2560px) in `frontend/tests/integration/LandingPage.test.tsx`
- [x] T036 [P] [US1] RED: Write test for landing page load time < 3 seconds in `frontend/tests/integration/LandingPage.test.tsx`

### Implementation for User Story 1 (TDD - Green Phase)

- [x] T037 [P] [US1] GREEN: Install shadcn/ui Button component via CLI to `frontend/src/components/ui/button.tsx`
- [x] T038 [P] [US1] GREEN: Install shadcn/ui Card component via CLI to `frontend/src/components/ui/card.tsx`
- [x] T039 [US1] GREEN: Create PublicLayout component in `frontend/src/components/layout/PublicLayout.tsx`
- [x] T040 [US1] GREEN: Create Header component for public pages in `frontend/src/components/layout/Header.tsx`
- [x] T041 [US1] GREEN: Create Footer component in `frontend/src/components/layout/Footer.tsx`
- [x] T041a [US1] GREEN: Add logo placeholder and branding CSS variables in Header/Footer (FR-011)
- [x] T042 [US1] GREEN: Implement LandingPage component with hero, features, CTA in `frontend/src/pages/LandingPage.tsx`
- [x] T043 [US1] Configure route for `/` to LandingPage in PublicLayout in `frontend/src/routes.tsx`
- [x] T044 [US1] REFACTOR: Ensure landing page tests pass, optimize for < 3s load time

**Checkpoint**: User Story 1 complete - Landing page functional and independently testable

---

## Phase 4: User Story 2 - Navigate Application Modules (Priority: P1)

**Goal**: Authenticated dashboard with persistent sidebar navigation showing all modules

**Independent Test**: Login → See sidebar → Click module → Navigate correctly → Active state shown (SC-002, SC-004)

**Requirements**: FR-002, FR-004, FR-005, FR-006, FR-007, SC-002, SC-004

### Backend Tasks for User Story 2

- [ ] T045 [P] [US2] RED: Write contract test for GET `/api/v1/modules` in `backend/tests/contract/test_openapi_compliance.py`
- [ ] T046 [P] [US2] RED: Write integration test for modules endpoint returning module list in `backend/tests/integration/test_modules_api.py`
- [ ] T047 [P] [US2] RED: Write integration test for GET `/api/v1/modules/{moduleId}` in `backend/tests/integration/test_modules_api.py`
- [ ] T048 [US2] GREEN: Create Module Pydantic model per data-model.md in `backend/src/models/module.py`
- [ ] T049 [US2] GREEN: Create module configuration YAML file in `backend/src/config/modules.yaml`
- [ ] T050 [US2] GREEN: Implement ModuleService for loading modules from YAML in `backend/src/services/module_service.py`
- [ ] T051 [US2] GREEN: Implement modules endpoints (list, get by ID) in `backend/src/api/routes/modules.py`
- [ ] T052 [US2] Register modules router in FastAPI app in `backend/src/api/main.py`
- [ ] T053 [US2] REFACTOR: Verify modules API tests pass

### Frontend Tests for User Story 2 (TDD - Red Phase)

- [ ] T054 [P] [US2] RED: Write unit test for moduleStore (fetch, select) in `frontend/tests/unit/stores/moduleStore.test.ts`
- [ ] T055 [P] [US2] RED: Write unit test for Sidebar component navigation in `frontend/tests/unit/components/Sidebar.test.tsx`
- [ ] T056 [P] [US2] RED: Write test for navigation active state indication in `frontend/tests/unit/components/Sidebar.test.tsx`
- [ ] T057 [P] [US2] RED: Write integration test for Dashboard with module navigation in `frontend/tests/integration/Dashboard.test.tsx`
- [ ] T058 [P] [US2] RED: Write test for mobile sidebar toggle in `frontend/tests/unit/components/Sidebar.test.tsx`

### Frontend Implementation for User Story 2 (TDD - Green Phase)

- [ ] T059 [P] [US2] GREEN: Install shadcn/ui Sidebar component via CLI to `frontend/src/components/ui/sidebar.tsx`
- [ ] T060 [US2] GREEN: Create moduleService for API calls in `frontend/src/services/moduleService.ts`
- [ ] T061 [US2] GREEN: Create moduleStore with Zustand in `frontend/src/stores/moduleStore.ts`
- [ ] T062 [US2] GREEN: Create useModules hook in `frontend/src/hooks/useModules.ts`
- [ ] T063 [US2] GREEN: Create Sidebar component with navigation items in `frontend/src/components/layout/Sidebar.tsx`
- [ ] T064 [US2] GREEN: Create AppLayout component with sidebar in `frontend/src/components/layout/AppLayout.tsx`
- [ ] T065 [US2] GREEN: Create Dashboard page component in `frontend/src/pages/Dashboard.tsx`
- [ ] T066 [US2] Configure routes for `/app` with AppLayout and Dashboard in `frontend/src/routes.tsx`
- [ ] T067 [US2] REFACTOR: Verify navigation tests pass, < 2 clicks to any module

**Checkpoint**: User Story 2 complete - Navigation functional and independently testable

---

## Phase 5: User Story 3 - Switch Theme Mode (Priority: P2)

**Goal**: Light/dark theme toggle with persistence across sessions, < 100ms switch

**Independent Test**: Click toggle → Theme changes → Refresh → Theme persists (SC-003)

**Requirements**: FR-008, FR-009, FR-010, SC-003

### Frontend Tests for User Story 3 (TDD - Red Phase)

- [ ] T068 [P] [US3] RED: Write unit test for themeStore (toggle, persist) in `frontend/tests/unit/stores/themeStore.test.ts`
- [ ] T069 [P] [US3] RED: Write unit test for ThemeToggle component in `frontend/tests/unit/components/ThemeToggle.test.tsx`
- [ ] T070 [P] [US3] RED: Write test for theme persistence across page reload in `frontend/tests/unit/stores/themeStore.test.ts`
- [ ] T071 [P] [US3] RED: Write test for system theme detection in `frontend/tests/unit/stores/themeStore.test.ts`

### Frontend Implementation for User Story 3 (TDD - Green Phase)

- [ ] T072 [US3] GREEN: Create themeStore with Zustand persist middleware in `frontend/src/stores/themeStore.ts`
- [ ] T073 [US3] GREEN: Create useTheme hook with system detection in `frontend/src/hooks/useTheme.ts`
- [ ] T074 [US3] GREEN: Create ThemeToggle component in `frontend/src/components/common/ThemeToggle.tsx`
- [ ] T075 [US3] Integrate ThemeToggle into Header component in `frontend/src/components/layout/Header.tsx`
- [ ] T076 [US3] Add dark mode class toggle to document root in `frontend/src/App.tsx`
- [ ] T077 [US3] REFACTOR: Verify theme tests pass, < 100ms switch time, all components themed

**Checkpoint**: User Story 3 complete - Theme switching functional and independently testable

---

## Phase 6: User Story 4 - View Module Cards on Dashboard (Priority: P2)

**Goal**: Dashboard displays module cards with name, description, icon; clicking navigates to module

**Independent Test**: View dashboard → See module cards → Click card → Navigate to module (SC-005)

**Requirements**: FR-016, FR-017, FR-018, FR-019, SC-005

### Frontend Tests for User Story 4 (TDD - Red Phase)

- [ ] T078 [P] [US4] RED: Write unit test for ModuleCard component in `frontend/tests/unit/components/ModuleCard.test.tsx`
- [ ] T079 [P] [US4] RED: Write unit test for ModuleGrid component in `frontend/tests/unit/components/ModuleGrid.test.tsx`
- [ ] T080 [P] [US4] RED: Write test for disabled module card display in `frontend/tests/unit/components/ModuleCard.test.tsx`
- [ ] T081 [P] [US4] RED: Write test for module card click navigation in `frontend/tests/unit/components/ModuleCard.test.tsx`

### Frontend Implementation for User Story 4 (TDD - Green Phase)

- [ ] T082 [US4] GREEN: Create ModuleCard component in `frontend/src/components/modules/ModuleCard.tsx`
- [ ] T083 [US4] GREEN: Create ModuleGrid component in `frontend/src/components/modules/ModuleGrid.tsx`
- [ ] T084 [US4] Integrate ModuleGrid into Dashboard page in `frontend/src/pages/Dashboard.tsx`
- [ ] T085 [US4] Add Lucide icons integration for module icons in `frontend/src/components/modules/ModuleCard.tsx`
- [ ] T086 [US4] REFACTOR: Verify module card tests pass, cards render from configuration
- [ ] T086a [P] [US4] RED: Write test for empty modules state display in `frontend/tests/unit/components/ModuleGrid.test.tsx`
- [ ] T086b [P] [US4] RED: Write test for long module name truncation with tooltip in `frontend/tests/unit/components/ModuleCard.test.tsx`
- [ ] T086c [US4] GREEN: Handle empty modules state with helpful message in ModuleGrid
- [ ] T086d [US4] GREEN: Add text truncation + title tooltip for long module names in ModuleCard

**Checkpoint**: User Story 4 complete - Module cards functional and independently testable

---

## Phase 7: User Story 5 - Access Authentication Shell (Priority: P2)

**Goal**: Mocked auth with login/logout, user profile indicator, swappable provider design

**Independent Test**: Click login → See user info → Click logout → Redirected to landing (SC-008)

**Requirements**: FR-012, FR-013, FR-014, FR-015, SC-008

### Backend Tasks for User Story 5

- [ ] T087 [P] [US5] RED: Write contract test for auth endpoints per OpenAPI in `backend/tests/contract/test_openapi_compliance.py`
- [ ] T088 [P] [US5] RED: Write integration test for POST `/api/v1/auth/login` in `backend/tests/integration/test_auth_api.py`
- [ ] T089 [P] [US5] RED: Write integration test for GET `/api/v1/auth/me` in `backend/tests/integration/test_auth_api.py`
- [ ] T090 [P] [US5] RED: Write integration test for POST `/api/v1/auth/logout` in `backend/tests/integration/test_auth_api.py`
- [ ] T091 [US5] GREEN: Create UserSession and UserPreferences models in `backend/src/models/user.py`
- [ ] T092 [US5] GREEN: Implement AuthService with mock auth in `backend/src/services/auth_service.py`
- [ ] T093 [US5] GREEN: Create auth dependency for swappable provider in `backend/src/api/dependencies/auth.py`
- [ ] T094 [US5] GREEN: Implement auth endpoints (login, logout, me) in `backend/src/api/routes/auth.py`
- [ ] T095 [US5] Register auth router in FastAPI app in `backend/src/api/main.py`
- [ ] T096 [US5] REFACTOR: Verify auth API tests pass

### Frontend Tests for User Story 5 (TDD - Red Phase)

- [ ] T097 [P] [US5] RED: Write unit test for authStore (login, logout, state) in `frontend/tests/unit/stores/authStore.test.ts`
- [ ] T098 [P] [US5] RED: Write unit test for useAuth hook in `frontend/tests/unit/hooks/useAuth.test.ts`
- [ ] T099 [P] [US5] RED: Write integration test for LoginPage in `frontend/tests/integration/LoginPage.test.tsx`
- [ ] T100 [P] [US5] RED: Write test for user profile indicator in header in `frontend/tests/unit/components/Header.test.tsx`
- [ ] T101 [P] [US5] RED: Write test for protected route redirect in `frontend/tests/integration/Navigation.test.tsx`

### Frontend Implementation for User Story 5 (TDD - Green Phase)

- [ ] T102 [US5] GREEN: Create authService for API calls in `frontend/src/services/authService.ts`
- [ ] T103 [US5] GREEN: Create authStore with Zustand in `frontend/src/stores/authStore.ts`
- [ ] T104 [US5] GREEN: Create useAuth hook in `frontend/src/hooks/useAuth.ts`
- [ ] T105 [US5] GREEN: Create LoginPage component in `frontend/src/pages/LoginPage.tsx`
- [ ] T106 [US5] GREEN: Add user profile indicator to Header in `frontend/src/components/layout/Header.tsx`
- [ ] T107 [US5] Create ProtectedRoute wrapper component in `frontend/src/components/common/ProtectedRoute.tsx`
- [ ] T108 [US5] Configure login route and protected routes in `frontend/src/routes.tsx`
- [ ] T109 [US5] REFACTOR: Verify auth tests pass, shell ready for provider swap

**Checkpoint**: User Story 5 complete - Auth shell functional and independently testable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling & Edge Cases

- [ ] T110 [P] RED: Write test for ErrorBoundary component in `frontend/tests/unit/components/ErrorBoundary.test.tsx`
- [ ] T111 [P] RED: Write test for NotFound (404) page in `frontend/tests/integration/NotFound.test.tsx`
- [ ] T112 [P] RED: Write test for loading states (LoadingSpinner) in `frontend/tests/unit/components/LoadingSpinner.test.tsx`
- [ ] T113 GREEN: Create ErrorBoundary component in `frontend/src/components/common/ErrorBoundary.tsx`
- [ ] T114 GREEN: Create NotFound page in `frontend/src/pages/NotFound.tsx`
- [ ] T115 GREEN: Create LoadingSpinner component in `frontend/src/components/common/LoadingSpinner.tsx`
- [ ] T116 Configure 404 route in `frontend/src/routes.tsx`

### Observability (FR-024 to FR-028)

- [ ] T117 [P] RED: Write test for readiness probe endpoint in `backend/tests/integration/test_health_api.py`
- [ ] T118 GREEN: Implement readiness probe endpoint in `backend/src/api/routes/health.py`
- [ ] T119 Configure structlog for JSON output in `backend/src/config/logging.py`
- [ ] T120 Add frontend performance metrics collection in `frontend/src/lib/metrics.ts`

### Accessibility (WCAG 2.1 AA)

- [ ] T120a Run axe-core accessibility audit on all pages (LandingPage, Dashboard, LoginPage)
- [ ] T120b Fix any WCAG 2.1 AA violations identified by audit

### Documentation & Validation

- [ ] T121 Run full backend test suite with coverage report
- [ ] T122 Run full frontend test suite with coverage report
- [ ] T123 Validate quickstart.md setup instructions work end-to-end
- [ ] T124 Verify OpenAPI spec matches implementation (`backend/tests/contract/test_openapi_compliance.py`)
- [ ] T125 Update plan.md Next Steps to mark Phase 2 (tasks) complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Landing) and US2 (Navigation) are both P1 - can run in parallel
  - US3, US4, US5 are P2 - can run in parallel after US1/US2
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
     ↓
Phase 2: Foundational (BLOCKING)
     ↓
     ├── US1 (P1): Landing Page ──────────────┐
     │                                         │
     ├── US2 (P1): Navigation ────────────────┼── Can run in parallel
     │                                         │
     └── After US1/US2: ──────────────────────┘
              ↓
         ├── US3 (P2): Theme ─────────────────┐
         │                                     │
         ├── US4 (P2): Module Cards ──────────┼── Can run in parallel
         │                                     │
         └── US5 (P2): Auth Shell ────────────┘
                    ↓
              Phase 8: Polish
```

### Within Each User Story (TDD Cycle)

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while tests stay green

---

## Parallel Execution Examples

### Phase 1: Setup (All [P] tasks can run together)

```bash
# Launch in parallel:
Task: T002 "Initialize backend Python project"
Task: T003 "Initialize frontend TypeScript project"
Task: T004 "Configure backend linting"
Task: T005 "Configure frontend linting"
Task: T006 "Create Vitest configuration"
Task: T007 "Create pytest configuration"
Task: T008 "Setup Tailwind CSS"
Task: T009 "Initialize shadcn/ui"
Task: T011 "Create Docker Compose"
```

### User Story 1: Landing Page (Red Phase)

```bash
# Launch all US1 tests in parallel:
Task: T034 "RED: Integration test for landing page rendering"
Task: T035 "RED: Test for responsive layout"
Task: T036 "RED: Test for load time"
```

### User Story 2: Navigation (Backend + Frontend parallel)

```bash
# Backend tests in parallel:
Task: T045 "RED: Contract test for modules endpoint"
Task: T046 "RED: Integration test for modules list"
Task: T047 "RED: Integration test for module by ID"

# Frontend tests in parallel:
Task: T054 "RED: Unit test for moduleStore"
Task: T055 "RED: Unit test for Sidebar"
Task: T056 "RED: Test for active state"
Task: T057 "RED: Integration test for Dashboard"
Task: T058 "RED: Test for mobile toggle"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (CRITICAL)
3. ✅ Complete Phase 3: User Story 1 (Landing Page)
4. **STOP and VALIDATE**: Test landing page loads < 3s, responsive
5. Deploy/demo landing page as MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 | Public landing page |
| +Navigation | US1 + US2 | Authenticated dashboard with navigation |
| +Theme | US1-3 | Dark/light mode preference |
| +Cards | US1-4 | Module discovery via cards |
| +Auth | US1-5 | Full auth shell, ready for integration |

### Parallel Team Strategy

With multiple developers:

```
Developer A: US1 (Landing) → US3 (Theme)
Developer B: US2 (Navigation) → US4 (Cards)
Developer C: Backend foundation → US5 (Auth)
```

---

## CLI Commands Reference

### Backend

```bash
# Run all tests
cd backend && pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/integration/test_health_api.py -v

# Type check
mypy src

# Lint
ruff check src tests
```

### Frontend

```bash
# Run all tests
cd frontend && npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- ThemeToggle

# Type check
npm run type-check

# Lint
npm run lint
```

### Docker

```bash
# Start all services
cd docker && docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Notes

- **[P] tasks** = different files, no dependencies - safe to parallelize
- **[Story] label** maps task to user story for traceability
- **TDD is mandatory**: Write failing test → implement → refactor
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tests must pass before moving to next phase
