# API Architect

A comprehensive platform for designing, building, and managing OpenAPI specifications with a form-based visual builder.

## Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/jamilurrahmanmuhammad/api-architect.git
cd api-architect

# Start all services
docker compose up -d

# Wait for services to be healthy (about 30 seconds)
docker compose ps

# Access the application
open http://localhost:3000
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| Backend API | http://localhost:8765 | FastAPI backend |
| API Docs | http://localhost:8765/api/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

### Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Clean restart (removes volumes)
docker compose down -v && docker compose up -d --build
```

## Features

### Form-Based API Builder
Access at: http://localhost:3000/api-builder (standalone) or http://localhost:3000/app/api-design (authenticated)

- **Visual OAS Editor**: Create OpenAPI specs without writing YAML/JSON
- **Profile Levels**: Basic, Advanced, Technical, Expert - progressive disclosure
- **Import/Export**: JSON, YAML, CSV formats
- **Real-time Validation**: Instant feedback on OAS compliance
- **Undo/Redo**: Full history with keyboard shortcuts (Ctrl+Z/Y)

### Components

| Tab | Description |
|-----|-------------|
| API Info | Title, version, description, servers, contact |
| Models | Schema/model definitions with field editing |
| Operations | API endpoints with parameters |
| Security | Authentication schemes (API Key, OAuth2, OpenID) |
| Export | Download as JSON/YAML/CSV, PDF documentation |

## Local Development

### Prerequisites

- Node.js 22+
- Python 3.12+
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### Backend Setup

```bash
cd backend/editor-api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or .venv\Scripts\activate  # Windows

# Install dependencies
pip install -e .

# Set environment variables
cp .env.example .env
# Edit .env with your database URL

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload --port 8765
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Run Tests

```bash
# Backend tests
cd backend/editor-api
source .venv/bin/activate
pytest tests/ -v

# Frontend tests
cd frontend
npm run test

# E2E tests (requires Playwright)
cd frontend
npx playwright install
npx playwright test
```

## Project Structure

```
api-architect/
├── backend/
│   └── editor-api/           # FastAPI backend
│       ├── src/
│       │   ├── main.py       # Application entry
│       │   ├── api/          # Route handlers
│       │   ├── models/       # Pydantic schemas
│       │   ├── services/     # Business logic
│       │   └── db/           # Database setup
│       └── tests/            # Backend tests
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── forms/        # Form-based API builder
│   │   │   ├── ui/           # Shadcn UI components
│   │   │   └── layout/       # Layout components
│   │   ├── pages/            # Page components
│   │   ├── providers/        # Context providers
│   │   └── store/            # Redux store
│   └── tests/                # Frontend tests
│
├── docker-compose.yaml        # Docker orchestration
└── specs/                     # Feature specifications
```

## API Builder Components

### Core Components
- `FormStateProvider` - State management with undo/redo
- `FormField` - Reusable form inputs with validation
- `ProfileGate` - Conditional rendering by expertise level

### Tab Components
- `ApiInfoTab` - API metadata editing
- `ModelsTab` - Schema definitions
- `OperationsTab` - Endpoint management
- `ParametersEditor` - Query/path/header parameters
- `RequestResponseEditor` - Request/response bodies
- `SecurityTab` - Security schemes
- `ExportTab` - Export options

### Import/Export
- `OASImportDialog` - Import JSON/YAML specs
- `CSVImportDialog` - Import from CSV
- `CSVExportFlow` - Export to CSV (Basic/Advanced/Expert)
- `PDFExportFlow` - Generate PDF documentation
- `MergeConflictDialog` - Resolve import conflicts

### UI Components
- `ProfileSelector` - Profile level dropdown
- `ValidationPanel` - Real-time validation
- `OASViewer` - JSON/YAML syntax highlighting
- `UndoRedoButtons` - Undo/redo with shortcuts

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend
```env
VITE_API_URL=http://localhost:8765
```

## Test Results

- **1043 unit tests** passing
- **5 performance benchmarks** passing
- **15 E2E tests** defined

### Performance Benchmarks
| Metric | Result | Target |
|--------|--------|--------|
| CSV Export (500 ops) | 1.76ms | <5000ms |
| OAS Validation | 0.41ms | <3000ms |
| JSON Serialization | 7.99ms | <1000ms |
| Path Extraction | 1.33ms | <500ms |
| Memory Usage | 4.26MB | <50MB |

## Technology Stack

### Backend
- FastAPI 0.104
- SQLAlchemy 2.0 (async)
- Pydantic 2.5
- PostgreSQL 16
- Redis 7
- Alembic (migrations)

### Frontend
- React 19
- TypeScript 5.9
- Vite 7
- Redux Toolkit
- TanStack Query
- Tailwind CSS 4
- Shadcn UI
- Radix UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TDD approach (write tests first)
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
