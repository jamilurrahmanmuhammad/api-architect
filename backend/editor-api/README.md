# API Architect Editor API

Backend service for the Requirements Grammar Authoring Studio.

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Poetry (for dependency management)

### Installation

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**
   ```bash
   alembic upgrade head
   ```

4. **Run development server:**
   ```bash
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- Health Check: `http://localhost:8000/health`

## Project Structure

```
backend/editor-api/
├── src/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/                    # API route handlers
│   │   └── routes/
│   │       ├── files.py        # File CRUD endpoints
│   │       ├── parse.py        # DSL parsing endpoints
│   │       ├── validate.py     # Validation endpoints
│   │       └── export.py       # Export endpoints
│   ├── db/                     # Database configuration and utilities
│   │   ├── database.py         # SQLAlchemy setup
│   │   ├── repository.py       # Data access layer
│   │   └── migrations/         # Alembic migrations
│   ├── models/                 # ORM and Pydantic models
│   │   ├── file.py             # RequirementFile ORM model
│   │   ├── service.py          # Service ORM model
│   │   ├── model.py            # Model ORM model
│   │   ├── operation.py        # Operation ORM model
│   │   ├── error.py            # Error ORM model
│   │   └── schemas.py          # Pydantic request/response schemas
│   ├── services/               # Business logic services
│   │   ├── file_service.py     # File management logic
│   │   ├── parser_service.py   # DSL parsing logic
│   │   └── validator_service.py# Validation logic
│   ├── middleware/             # Custom middleware
│   │   ├── error_handler.py    # Error handling middleware
│   │   └── logging.py          # Structured logging middleware
│   └── utils/                  # Utility functions
│       ├── logging.py          # Logging configuration
│       └── config.py           # Configuration management
├── tests/
│   ├── unit/                   # Unit tests
│   ├── contract/               # API contract tests
│   └── integration/            # Integration tests
├── pyproject.toml              # Project metadata and dependencies
├── .env.example                # Environment variables template
└── README.md                   # This file
```

## Architecture

The editor API follows a layered architecture:

1. **Route Layer** (`api/routes/`) - HTTP request/response handling
2. **Service Layer** (`services/`) - Business logic and orchestration
3. **Data Layer** (`db/repository.py`) - Database interactions
4. **ORM Layer** (`models/`) - SQLAlchemy entity definitions
5. **Validation Layer** (`services/validator_service.py`) - DSL validation rules

## Key Features

### Async Support
All endpoints are async-first using `async def`. This enables:
- High concurrency for simultaneous editor sessions
- Non-blocking I/O operations (database, file system)
- Efficient resource utilization

### API Endpoints

#### Files Management
- `GET /api/v1/files` - List all files with pagination
- `POST /api/v1/files` - Create new requirement file
- `GET /api/v1/files/{fileId}` - Get file content and metadata
- `PUT /api/v1/files/{fileId}` - Update file content (increments version)
- `DELETE /api/v1/files/{fileId}` - Soft delete file

#### DSL Parsing
- `POST /api/v1/parse` - Parse DSL source, return AST and errors

#### Validation
- `POST /api/v1/validate` - Validate DSL syntax and semantics

#### Export
- `POST /api/v1/export` - Export parsed requirements (JSON/YAML)

## Development

### Running Tests
```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=src

# Run specific test file
poetry run pytest tests/unit/test_parser.py

# Run async tests
poetry run pytest -v --asyncio-mode=auto
```

### Code Quality
```bash
# Format code
poetry run black src/ tests/

# Lint
poetry run ruff check src/ tests/

# Type checking
poetry run mypy src/

# Pre-commit hooks
pre-commit run --all-files
```

### Database Migrations
```bash
# Create migration (auto-generated from ORM models)
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# View migration history
alembic history
alembic current
```

**Detailed guide:** See `src/db/MIGRATIONS.md` for comprehensive migration workflows and best practices.

## Configuration

Environment variables are loaded from `.env` file. See `.env.example` for all available options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `API_PORT` - Server port (default: 8000)
- `DEBUG` - Enable debug mode
- `CORS_ORIGINS` - Allowed CORS origins

## Observability

### Logging
Structured JSON logging is configured in `src/utils/logging.py`.
Logs include:
- Request/response tracking
- Database query logging
- Error stack traces with context

### Metrics
OpenTelemetry integration for Prometheus metrics (Phase 2).

### Tracing
Distributed tracing support via Jaeger (Phase 2).

## Deployment

### Docker
```bash
docker build -t api-architect-editor-api .
docker run -p 8000:8000 --env-file .env api-architect-editor-api
```

### Kubernetes
See `k8s/` directory for Kubernetes manifests (Deployment, Service, ConfigMap).

```bash
kubectl apply -f k8s/editor-api-deployment.yaml
```

## Contributing

1. Follow TDD: Write tests first, then implementation
2. Use async/await for all I/O operations
3. Follow PEP 8 with Black formatter
4. Type hints required for all functions
5. Update documentation for API changes

## License

MIT
