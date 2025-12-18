# Quickstart: Core Framework & Professional Home Page

**Feature**: 001-core-framework-homepage
**Date**: 2025-12-10

## Prerequisites

### Required Software

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Python | 3.12+ | `python --version` |
| uv | 0.4+ | `uv --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |

### Installation

**Node.js** (via nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

**Python** (via pyenv):
```bash
curl https://pyenv.run | bash
pyenv install 3.12
pyenv global 3.12
```

**uv** (Python package manager):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## Quick Setup (5 minutes)

### 1. Clone and Navigate
```bash
cd /home/jamil/repos/api-architect
git checkout 001-core-framework-homepage
```

### 2. Backend Setup
```bash
# Create virtual environment and install dependencies
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# Run tests (TDD verification)
pytest

# Start development server
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
# Install dependencies
cd ../frontend
npm install

# Run tests (TDD verification)
npm test

# Start development server
npm run dev
```

### 4. Verify Setup
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/v1/health

---

## Docker Setup (Alternative)

### Start All Services
```bash
cd docker
docker compose up -d
```

### View Logs
```bash
docker compose logs -f
```

### Stop Services
```bash
docker compose down
```

---

## Development Workflow (TDD)

### 1. Red Phase - Write Failing Test

**Frontend Example** (ThemeToggle):
```bash
cd frontend
# Create test file first
cat > tests/unit/components/ThemeToggle.test.tsx << 'EOF'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeToggle } from '@/components/common/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('should render toggle button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('should toggle dark mode when clicked', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })

    fireEvent.click(button)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
EOF

# Run test (should fail - Red)
npm test -- ThemeToggle
```

**Backend Example** (Health endpoint):
```bash
cd backend
# Create test file first
cat > tests/integration/test_health_api.py << 'EOF'
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_health_returns_healthy_status(client: AsyncClient):
    response = await client.get("/api/v1/health")
    data = response.json()
    assert data["data"]["status"] == "healthy"

@pytest.mark.asyncio
async def test_health_includes_version(client: AsyncClient):
    response = await client.get("/api/v1/health")
    data = response.json()
    assert "version" in data["data"]
EOF

# Run test (should fail - Red)
pytest tests/integration/test_health_api.py -v
```

### 2. Green Phase - Implement Minimum Code

Implement just enough code to make the tests pass.

### 3. Refactor Phase - Clean Up

Improve code quality while keeping tests green.

---

## Common Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm test` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run build` | Production build |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix lint issues |
| `npm run type-check` | TypeScript check |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn src.api.main:app --reload` | Start dev server |
| `pytest` | Run all tests |
| `pytest --cov=src` | Run with coverage |
| `ruff check src tests` | Lint code |
| `ruff format src tests` | Format code |
| `mypy src` | Type check |

### Docker

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start services |
| `docker compose down` | Stop services |
| `docker compose logs -f` | View logs |
| `docker compose build` | Rebuild images |

---

## Project Structure

```
api-architect/
├── backend/
│   ├── src/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # Pydantic models
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration
│   ├── tests/
│   │   ├── unit/          # Unit tests
│   │   ├── integration/   # API tests
│   │   └── contract/      # Contract tests
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   ├── tests/
│   │   ├── unit/          # Component tests
│   │   └── integration/   # Page tests
│   └── package.json
│
├── docker/
│   └── docker-compose.yml
│
└── specs/
    └── 001-core-framework-homepage/
        ├── spec.md
        ├── plan.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md    # This file
        ├── contracts/
        │   └── openapi.yaml
        └── tasks.md         # Generated by /sp.tasks
```

---

## Environment Variables

### Backend (.env)
```bash
# Application
ENVIRONMENT=development
LOG_LEVEL=debug
API_VERSION=0.1.0

# Server
HOST=0.0.0.0
PORT=8000

# Auth (mock)
MOCK_AUTH_ENABLED=true
MOCK_TOKEN=mock-token-12345
```

### Frontend (.env)
```bash
# API
VITE_API_URL=http://localhost:8000
VITE_API_VERSION=v1
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

### Python Dependencies Issues
```bash
rm -rf .venv
uv venv
uv pip install -e ".[dev]"
```

### Docker Issues
```bash
docker compose down -v  # Remove volumes
docker system prune -a  # Clean all
docker compose build --no-cache
```

---

## Next Steps

After setup, proceed to implement the feature tasks:

1. Run `/sp.tasks` to generate the implementation tasks
2. Follow TDD cycle for each task
3. Commit frequently with meaningful messages
4. Create PR when feature is complete

---

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Vitest Documentation](https://vitest.dev)
- [pytest Documentation](https://docs.pytest.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
