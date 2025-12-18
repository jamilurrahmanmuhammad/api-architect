# Testing Guide for Phase 1

Complete guide to testing Phase 1 infrastructure for the API Architect project.

## Backend Testing

### Quick Start

```bash
# Navigate to backend
cd backend/editor-api

# Install dependencies (if not already done)
source .venv/bin/activate
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run specific test file
pytest tests/unit/test_schemas.py

# Run with coverage
pytest --cov=src --cov-report=html

# Run with verbose output
pytest -v

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/
```

### Test Structure

```
backend/editor-api/tests/
├── conftest.py                 # Shared fixtures and configuration
├── unit/
│   ├── __init__.py
│   └── test_schemas.py        # Schema validation tests
├── integration/
│   ├── __init__.py
│   └── test_health_check.py   # API endpoint tests
└── contract/                   # (Future) API contract tests
```

### What's Being Tested

#### 1. Unit Tests (`tests/unit/`)

**test_schemas.py** - Pydantic model validation
- ✅ Valid request/response creation
- ✅ Required fields validation
- ✅ Field length constraints (min/max)
- ✅ Enum value validation (status)
- ✅ Optional fields handling

**Test Coverage:**
- RequirementFileCreateRequest (4 tests)
- RequirementFileResponse (3 tests)
- ParseError (2 tests)
- ParsedService (1 test)
- ValidateResponse (3 tests)

Run:
```bash
pytest tests/unit/test_schemas.py -v
```

#### 2. Integration Tests (`tests/integration/`)

**test_health_check.py** - API endpoints
- ✅ Health check endpoint (`GET /health`)
- ✅ Root endpoint (`GET /`)
- ✅ API docs availability (`GET /api/docs`)
- ✅ 404 error handling

Run:
```bash
pytest tests/integration/test_health_check.py -v
```

### Database Testing Strategy

Tests use **in-memory SQLite** for speed and isolation:

```python
# conftest.py automatically provides test database
@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    # Creates in-memory database
    # Tables created before test
    # Tables dropped after test
    yield session
```

**Benefits:**
- No database setup needed
- Tests run in milliseconds
- Completely isolated (no test pollution)
- No external dependencies

### Running Backend Tests Step-by-Step

```bash
# 1. Navigate to backend
cd backend/editor-api

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install test dependencies (if needed)
pip install pytest pytest-asyncio httpx

# 4. Run all tests
pytest

# Expected output:
# ===== test session starts =====
# collected 17 items
#
# tests/unit/test_schemas.py::TestRequirementFileCreateRequest::test_valid_create_request PASSED
# tests/unit/test_schemas.py::TestRequirementFileCreateRequest::test_create_request_name_required PASSED
# ...
# ===== 17 passed in 0.45s =====
```

### Troubleshooting Backend Tests

**Issue: "No module named src"**
```bash
# Solution: Ensure you're in backend/editor-api directory
pwd  # Should show: /path/to/api-architect/backend/editor-api

# Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**Issue: "aiosqlite not installed"**
```bash
# Solution: Install test dependencies
pip install pytest-asyncio httpx aiosqlite
```

**Issue: "Event loop error in async tests"**
```bash
# Solution: Make sure pytest.ini is configured
cat pytest.ini
# Should have: asyncio_mode = auto
```

### Adding More Backend Tests

To add new tests:

1. Create file in `tests/unit/` or `tests/integration/`
2. Import pytest and fixtures:
   ```python
   import pytest
   from httpx import AsyncClient
   from src.main import app
   ```
3. Mark async tests with `@pytest.mark.asyncio`
4. Use fixtures from conftest.py:
   ```python
   @pytest.mark.asyncio
   async def test_something(client: AsyncClient):
       response = await client.get("/api/endpoint")
       assert response.status_code == 200
   ```

---

## Frontend Testing

### Quick Start

```bash
# Navigate to frontend
cd frontend

# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- editorSlice.test.ts
```

### Test Structure

```
frontend/
├── src/
│   ├── store/
│   │   └── __tests__/
│   │       └── editorSlice.test.ts    # Redux reducer tests
│   └── hooks/
│       └── __tests__/                  # (Future) React Query hook tests
└── vitest.config.ts                    # Vitest configuration
```

### What's Being Tested

#### 1. Redux Slice Tests (`src/store/__tests__/`)

**editorSlice.test.ts** - Redux state management
- ✅ Initial state correctness
- ✅ setCurrentFile action
- ✅ updateContent action
- ✅ setSaving action
- ✅ setParseErrors action
- ✅ setPreviewData action
- ✅ clearEditor action

**Test Coverage:** 16 tests covering all actions and edge cases

Run:
```bash
npm run test -- editorSlice.test.ts
```

#### 2. Component Tests (Future)

Tests for React components will use:
- React Testing Library for user interactions
- MSW (Mock Service Worker) for API mocking
- Custom render with Redux provider

### Running Frontend Tests Step-by-Step

```bash
# 1. Navigate to frontend
cd frontend

# 2. Run tests
npm run test

# Expected output:
# ✓ src/store/__tests__/editorSlice.test.ts (16 tests)
#
# Tests:  16 passed (16)
```

### Test UI (Visual Testing)

```bash
# Open interactive test UI
npm run test:ui

# Then visit http://localhost:51204 in browser
# - See all tests listed
# - Click to run specific tests
# - View detailed results
# - Watch file changes update tests automatically
```

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# Output: coverage/index.html
# Open in browser to see:
# - Line coverage
# - Branch coverage
# - Function coverage
# - Statement coverage
```

### Troubleshooting Frontend Tests

**Issue: "Cannot find module src/store/hooks"**
```bash
# Solution: Make sure tsconfig.json has path aliases
# Already configured in your project
cat tsconfig.json
```

**Issue: "Test is timing out"**
```bash
# Solution: Increase timeout in test
it('should do something async', async () => {
  // ...
}, 10000); // 10 second timeout
```

**Issue: "Redux store not available in test"**
```bash
# Solution: Use setupTests.ts or mock store
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '@/store/slices/editorSlice';

const mockStore = configureStore({
  reducer: { editor: editorReducer }
});
```

### Adding More Frontend Tests

To add new tests:

1. Create file `src/component/__tests__/ComponentName.test.tsx`:
   ```tsx
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import { Provider } from 'react-redux';
   import { store } from '@/store';
   import MyComponent from '../MyComponent';

   describe('MyComponent', () => {
     it('should render', () => {
       render(
         <Provider store={store}>
           <MyComponent />
         </Provider>
       );
       expect(screen.getByText('expected text')).toBeDefined();
     });
   });
   ```

2. Run specific test:
   ```bash
   npm run test -- MyComponent.test.tsx
   ```

---

## Integration Testing (Backend + Frontend)

### Manual Testing

**1. Start Backend**
```bash
cd backend/editor-api
source .venv/bin/activate
uvicorn src.main:app --reload
# Server running at http://localhost:8000
```

**2. Start Frontend**
```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

**3. Test in Browser**
- Navigate to http://localhost:5173
- Open DevTools (F12)
- Check Console for errors
- Try creating/reading/updating files
- Verify Redux DevTools shows state changes
- Check Network tab for API calls

### Testing API Endpoints

**Test health check:**
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy"}
```

**Test API documentation:**
```bash
# Open in browser: http://localhost:8000/api/docs
# OpenAPI Swagger UI should display all endpoints
```

**Test CORS:**
```bash
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:8000/api/v1/files \
  -v
# Should return CORS headers
```

### Database Verification

**Check migrations applied:**
```bash
cd backend/editor-api
source .venv/bin/activate
alembic current
# Shows current revision (should be empty for now since no migrations created)

alembic history
# Shows all applied migrations
```

### Performance Testing

**Backend request latency:**
```bash
# Using curl with timing
curl -w "Time: %{time_total}s\n" \
  http://localhost:8000/health

# Should respond in < 50ms
```

**Frontend build size:**
```bash
cd frontend
npm run build

# Check dist/ directory
ls -lh dist/
# JavaScript bundle should be < 500KB gzipped
```

---

## Continuous Integration (GitHub Actions)

Example CI workflow (add to `.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend/editor-api
          pip install poetry
          poetry install
          pytest

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm ci
          npm run test:coverage
```

---

## Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Backend Schemas | 13/13 tests | 100% |
| Backend API | 4/4 tests | 100% |
| Redux Slices | 16/16 tests | 100% |
| React Components | 0/0 tests | 80%+ |
| **Overall** | **33 tests** | **100+** |

---

## Running All Tests

### Full Test Suite

```bash
# Backend tests
cd backend/editor-api
pytest -v --cov=src

# Frontend tests
cd ../../frontend
npm run test:coverage

# View combined results
echo "Backend coverage: coverage/index.html"
echo "Frontend coverage: coverage/index.html"
```

### Quick Smoke Test

```bash
# Backend quick test (10 seconds)
cd backend/editor-api
pytest tests/integration/

# Frontend quick test (5 seconds)
cd ../../frontend
npm run test -- --run
```

---

## Common Testing Patterns

### Async Test (Backend)

```python
@pytest.mark.asyncio
async def test_async_operation(client: AsyncClient):
    response = await client.get("/api/endpoint")
    assert response.status_code == 200
```

### Redux Action Test (Frontend)

```typescript
it('should update state', () => {
  const action = setCurrentFile({ fileId: 'test', content: 'test' });
  const state = editorReducer(initialState, action);
  expect(state.currentFileId).toBe('test');
});
```

### Mock HTTP Request (Frontend)

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/files', () => {
    return HttpResponse.json({ files: [] });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should fetch files', async () => {
  // Test code here
});
```

---

## Next Steps

After Phase 1 testing is passing:

1. **Phase 2 Testing:** Add tests for ORM models and service layer
2. **E2E Testing:** Add Playwright tests for full user workflows
3. **Load Testing:** Use Apache JMeter for performance testing
4. **API Contract Testing:** Pact for consumer-driven contracts
5. **Accessibility Testing:** axe-core for a11y compliance

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [React Testing Library](https://testing-library.com/react)
- [Redux Testing](https://redux.js.org/usage/writing-tests)
- [Testing Best Practices](https://testingjavascript.com/)
