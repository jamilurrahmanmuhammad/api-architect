# Implementation Plan: Requirements Grammar Authoring Studio

**Branch**: `002-requirements-grammar` | **Date**: 2025-12-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-requirements-grammar/spec.md`
**Constitution Authority**: Principle I.A (Interactive DSL Authoring Studio) — v1.1.0

## Summary

The Requirements Grammar Authoring Studio is an interactive, text-first DSL editor enabling requirements engineers to author API specifications using a markdown-based domain-specific language. Core value propositions:

- **Real-time authoring experience**: Split-pane editor/preview layout matching Swagger Editor UX with bidirectional selection
- **Incremental parsing**: Best-effort parsing showing valid entities even during incomplete edits
- **Live validation**: Real-time syntax checking with context-aware autocomplete
- **Backend persistence**: Cloud-native microservices architecture with version history and collaboration support
- **MVP scope**: Service, Model (basic types), Operation (HTTP CRUD), Error definitions; Security Phase 2

Technical approach: Markdown-based DSL syntax, React frontend with Monaco editor or CodeMirror, backend REST API with PostgreSQL/file storage, Kubernetes-deployable microservices with observability (Prometheus/Grafana, distributed tracing, ELK logging).

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.x (React 18.x)
- Backend: Python 3.11+ (FastAPI)
- DSL Parser: Python (ANTLR4 or hand-written recursive descent)

**Primary Dependencies**:
- Frontend: React 18, TypeScript, Monaco Editor or CodeMirror 6, Redux/TanStack Query, React Router
- Backend: FastAPI, Pydantic, SQLAlchemy ORM, Alembic (migrations)
- Infrastructure: Docker, Kubernetes, PostgreSQL 15, Redis (caching), Prometheus, ELK Stack

**Storage**: PostgreSQL 15 (backend-only, no local storage) with file versioning via git-like diff storage
**Testing**:
- Frontend: Vitest, React Testing Library, Playwright (E2E)
- Backend: pytest, pytest-asyncio, coverage
- Integration: Postman/Swagger test suite, contract testing

**Target Platform**: Linux (Kubernetes clusters), modern browsers (Chrome, Firefox, Safari, Edge) v90+
**Project Type**: Web application (frontend + backend microservices)

**Performance Goals**:
- Editor responsiveness: <200ms input-to-display feedback
- Syntax validation: <500ms per line
- Preview update: <1000ms (Swagger Editor parity)
- Autocomplete suggestions: <200ms
- Backend API: <200ms p95 latency for CRUD operations
- Support files up to 10,000 lines with responsive UX

**Latency Budget Allocation** (per ADR-0011):
- Client-side debounce: 300ms (bundle rapid keystrokes)
- Network round-trip time (RTT): ~150ms (typical connection)
- Backend parser + validation: ~50ms (hand-written recursive descent)
- React render + browser paint: ~100ms
- **Total expected latency**: ~600ms (within <1000ms target; acceptable per Swagger Editor UX)
- Mitigation: Client-side syntax highlighting (instant), debouncing (reduces parse requests), server caching (Phase 2)

**Constraints**:
- No local-only storage option; backend-only persistence required
- Cloud-native, microservices-oriented architecture mandatory
- Open source technologies only
- Observability and service mesh as first-class citizens
- Markdown-based DSL (plain text, version-control friendly)

**Scale/Scope**:
- MVP target: 100-1000 concurrent users
- Specification size: 1000-10,000 lines per document
- 2-3 backend microservices (Editor API, Parser Service, Storage Service)
- 1 frontend SPA component (integrated into Core Framework)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ PASS** – Feature 002 aligns with all constitutional principles:

| Principle | Alignment | Evidence |
|-----------|-----------|----------|
| **I. Text-First Authoring** | ✅ PASS | Markdown-based DSL is primary authoring mechanism; plain text source of truth |
| **I.A. Interactive DSL Authoring Studio** | ✅ PASS | Split-pane, real-time validation, incremental parsing, backend persistence all specified |
| **XIII. Implementation & Deployment** | ✅ PASS | Cloud-native, microservices, API-first, observability first-class, containerized, Kubernetes |
| **VI. Standards Compliance** | ✅ PASS | Export to OpenAPI/JSON/YAML aligns with spec standards |
| **VII. Security by Design** | ⚠️ DEFERRED | Security constraints deferred to Phase 2 per MVP scope |

**Justification**: No violations. Security deferral is constitutional (P2 scope explicitly stated in Principle I.A).

## Data Model

### Entity Relationship Diagram (MVP Scope)

```
┌─────────────────────────┐
│   RequirementFile       │
│                         │
│ - id (PK)              │
│ - name                  │
│ - content (DSL source)  │
│ - version               │
│ - created_at, updated_at│
│ - status                │
└────────────┬────────────┘
             │
             │ contains (1:N)
             │
    ┌────────┴─────┬─────────┬──────────┐
    │              │         │          │
    ▼              ▼         ▼          ▼
┌────────┐  ┌────────┐ ┌──────────┐ ┌───────┐
│Service │  │ Model  │ │Operation │ │ Error │
└────────┘  └────────┘ └──────────┘ └───────┘
    │           │           │          │
    └───────────┼───────────┴──────────┘
                │
                │ references
                │
         ┌──────▼─────────┐
         │  relationships  │
         │                 │
         │ - Service : N Models
         │ - Service : N Operations
         │ - Operation → Model (request)
         │ - Operation → Model (response)
         │ - Operation → N Errors
         │ - Error : independent
         └─────────────────┘
```

**Cardinality Constraints**:
- **RequirementFile → Service**: 1 file : 0..N services
- **RequirementFile → Model**: 1 file : 0..N models (global scope)
- **RequirementFile → Operation**: 1 file : 0..N operations
- **RequirementFile → Error**: 1 file : 0..N errors
- **Operation → Model (request/response)**: N operations : 1 model (referenced)
- **Operation → Error**: N operations : 0..N errors (referenced by status code)
- **Service partitioning**: Service A's operations only reference Service A's models (logical namespace)

### Core Entities (MVP)

```
RequirementFile
├── id: UUID (primary key)
├── name: string (filename, e.g., "petstore-api")
├── content: text (markdown DSL source)
├── version: integer (auto-incrementing)
├── created_at: timestamp
├── updated_at: timestamp
├── created_by: UUID (user_id)
├── status: enum (draft, reviewing, approved, published)
└── metadata: jsonb (custom tags, labels)

Service
├── id: UUID
├── name: string (canonical identifier, e.g., "petstore")
├── title: string (human-readable)
├── description: text
├── version: string (semantic versioning)
├── base_path: string (e.g., "/api/v1")
├── servers: array<{url, description}> (multiple server support)
└── contact: {name, url, email}

Model
├── id: UUID
├── name: string (canonical type name, e.g., "Pet")
├── description: text
├── fields: array<{name, type, required, constraints}>
│  └── type: enum (string, number, boolean, integer, object, array)
│  └── constraints: {minLength, maxLength, pattern, enum, min, max, default, format}
├── examples: array<object> (sample instances)
└── inheritance: {parent_model_id, discriminator_field}

Operation
├── id: UUID
├── method: enum (GET, POST, PUT, PATCH, DELETE)
├── path: string (e.g., "/pets/{id}")
├── summary: string (brief description)
├── description: text
├── tags: array<string> (for grouping)
├── parameters: array<{name, location, type, required, description}>
│  └── location: enum (path, query, header, cookie)
├── request_body: {content_type, schema_ref, required, description}
├── responses: array<{status_code, description, schema_ref, headers}>
│  └── status_code: string (e.g., "200", "400", "404", "5XX")
├── error_refs: array<error_id> (links to Error definitions)
└── deprecation: {deprecated: boolean, sunset_date, migration_guide}

Error
├── id: UUID
├── code: string (canonical identifier, e.g., "PET_NOT_FOUND")
├── status_code: integer (HTTP status, e.g., 404)
├── message: string (human-readable error message)
├── description: text (detailed explanation)
└── schema: object (error response payload structure)

ParsedRequirements (transient, generated during parsing)
├── services: array<Service>
├── models: array<Model>
├── operations: array<Operation>
├── errors: array<Error>
├── parse_errors: array<{line, column, message}> (for incomplete/invalid sections)
└── timestamp: timestamp (when parsed)
```

### State Transitions

```
RequirementFile: draft → reviewing → approved → published
  (Manual user transition, not automatic)

ParsedRequirements:
  - Valid entities added to preview in real-time
  - Invalid sections marked with error line numbers
  - Incremental: valid subset shown even if file incomplete
```

## API Contracts (OpenAPI 3.0)

### Editor API (Backend)

**Base URL**: `https://api.api-architect.local/editor/v1`

#### Files Resource

**GET /files** – List all requirement files
```
Response: 200 OK
{
  "files": [
    {
      "id": "uuid",
      "name": "petstore-api",
      "created_at": "2025-12-11T10:00:00Z",
      "updated_at": "2025-12-11T10:05:00Z",
      "status": "draft"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 10
}
```

**POST /files** – Create a new requirement file
```
Request:
{
  "name": "new-api",
  "content": "service: my-service\n  title: My API\n  ..."
}

Response: 201 Created
{
  "id": "uuid",
  "name": "new-api",
  "content": "...",
  "version": 1,
  "created_at": "...",
  "status": "draft"
}
```

**GET /files/{fileId}** – Get a specific file
```
Response: 200 OK
{
  "id": "uuid",
  "name": "petstore-api",
  "content": "...",
  "version": 5,
  "created_at": "...",
  "updated_at": "...",
  "status": "draft"
}
```

**PUT /files/{fileId}** – Update file content
```
Request:
{
  "content": "service: petstore\n  ..."
}

Response: 200 OK
{
  "id": "uuid",
  "content": "...",
  "version": 6,
  "updated_at": "..."
}
```

**DELETE /files/{fileId}** – Delete a file
```
Response: 204 No Content
```

#### Parse & Validation Resource

**POST /parse** – Parse DSL and return structured entities + errors
```
Request:
{
  "content": "service: petstore\n  ..."
}

Response: 200 OK
{
  "services": [...],
  "models": [...],
  "operations": [...],
  "errors": [...],
  "parse_errors": [
    {
      "line": 15,
      "column": 3,
      "message": "Expected 'operation' keyword or property definition"
    }
  ],
  "valid_entities": 23,
  "total_errors": 1
}
```

**POST /validate** – Validate DSL syntax without parsing
```
Request:
{
  "content": "..."
}

Response: 200 OK
{
  "valid": false,
  "errors": [
    {
      "line": 10,
      "column": 5,
      "message": "Invalid model field type: 'date' (use 'string' with format:'date')"
    }
  ]
}
```

#### Export Resource

**POST /export** – Export parsed requirements in JSON or YAML format

**Supported Formats**:
- **JSON**: Default; follows structure below
- **YAML**: YAML 1.2 (compatible with OpenAPI spec import)

```
Request:
{
  "file_id": "uuid",
  "format": "json" | "yaml",
  "include_metadata": true | false (default: true)
}

Response: 200 OK
Content-Type: application/json or application/yaml
{
  "metadata": {
    "file_id": "uuid",
    "file_name": "petstore-api",
    "exported_at": "2025-12-11T10:30:00Z",
    "version": 3,
    "dsl_version": "1.0"
  },
  "services": [
    {
      "id": "service-1",
      "name": "petstore",
      "title": "Petstore API",
      "description": "...",
      "version": "1.0.0",
      "base_path": "/api/v1",
      "servers": [{"url": "https://api.petstore.com", "description": "Production"}]
    }
  ],
  "models": [
    {
      "id": "model-1",
      "name": "Pet",
      "description": "...",
      "fields": [
        {"name": "id", "type": "integer", "required": true},
        {"name": "name", "type": "string", "required": true}
      ]
    }
  ],
  "operations": [
    {
      "id": "op-1",
      "service_id": "service-1",
      "method": "GET",
      "path": "/pets",
      "summary": "List all pets",
      "request": {...},
      "response": {"status": 200, "model_id": "model-1"},
      "error_refs": ["error-1"]
    }
  ],
  "errors": [
    {
      "id": "error-1",
      "status_code": 404,
      "name": "NotFound",
      "description": "..."
    }
  ]
}
```

**Export Validation**:
- All referenced model IDs in operations MUST exist in models array (referential integrity)
- All error codes MUST be valid HTTP status codes (100-599)
- Service names and model names MUST be unique within their scope
- MVP Phase 1: Exports valid parsed entities only; errors are not included (Phase 2: partial export with error metadata)
- Export fidelity: 100% round-trip capability (import exported JSON → yields identical AST)

### Frontend Components (React)

**EditorPane**: Monaco/CodeMirror instance with syntax highlighting, line numbers, DSL-specific themes
**PreviewPane**: Real-time display of parsed entities (Services, Models, Operations, Errors) with interactive selection
**SplitLayout**: Resizable container with editor on left, preview on right
**AutocompleteProvider**: Context-aware keyword suggestions based on cursor position
**ErrorPanel**: Inline error indicators with hover tooltips
**FileManager**: File list, create/load/save/delete operations

## Error Taxonomy & Messaging

Parser and validator errors are classified into two categories with specific message formatting to guide users toward resolution.

### Syntax Errors (Lexer/Parser Level)

Errors that occur during tokenization or structural parsing of the DSL. Shown immediately with line/column markers.

| Error Type | Example | Message Format | User Guidance |
|-----------|---------|-----------------|----------------|
| **Missing Header** | Service definition without `## Service` prefix | `L5: Expected '## Service' or '## Model' header` | Show "Valid headers: ## Service, ## Model, ## Operation, ## Error" |
| **Invalid Nesting** | Field outside model block | `L12: 'field:' not allowed outside '## Model' block; close current block first` | Suggest closing tag or parent block |
| **Malformed Table** | Missing pipe delimiters in field table | `L8: Expected '\\|' delimiter in model field table; check syntax at line start` | Show example: `\| name \| type \| required \|` |
| **Unclosed Block** | Code block without closing ``` | `L20: Unclosed code block; expected '​\`\`\`' to close` | Show line where block opened |
| **Invalid Keyword** | Typo in keyword (e.g., "servce" instead of "service") | `L3: Unknown keyword 'servce'; did you mean 'service'?` | Offer autocorrection suggestion |
| **Duplicate Entity** | Two models with same name | `L15: Model 'Pet' already defined at L7; duplicates not allowed` | Show first definition location |

### Semantic Errors (Validation Layer)

Errors that occur after parsing succeeds but validation rules are violated. Shown in validation phase with context.

| Error Type | Example | Message Format | User Guidance |
|-----------|---------|-----------------|----------------|
| **Missing Required Field** | Model without required `name:` field | `L8: '## Model' requires 'name:' field; add before field definitions` | Show minimal valid model template |
| **Invalid Type** | Type reference to undefined model | `L12: Model 'NonExistent' not found; available models: [Pet, Order]` | List valid model names |
| **Invalid HTTP Method** | Operation with unsupported method | `L20: HTTP method 'FETCH' not supported; use GET, POST, PUT, PATCH, DELETE` | List valid methods |
| **Invalid Status Code** | Error with non-numeric status | `L25: Status code must be HTTP code (100-599); '500x' is invalid` | Show valid ranges |
| **Missing Response Model** | Operation without response definition | `L18: Operation requires 'response:' block with model reference` | Show example response block |
| **Constraint Violation** | String field with max_length non-numeric | `L14: 'max_length' must be numeric; got 'abc'` | Show type requirements |

### Error Message Structure

All error messages follow this structure:
```
[LINE:COLUMN] ERROR_TYPE: Description; Guidance
```

**Example**:
```
L12:5 MISSING_FIELD: '## Model' requires 'name:' field; add before field definitions
  → Model created at line 12, expecting 'name: <model-name>' on next line
```

### Phase 2 Enhancements

- Automatic suggestion engine with ML-based "did you mean?" corrections
- Interactive fix suggestions with one-click application (Ctrl+.)
- Error documentation links (https://docs.api-architect.local/dsl-errors/<error_code>)
- Batch error reporting (show all errors in file, not just first)

## Project Structure

### Documentation (this feature)

```text
specs/002-requirements-grammar/
├── spec.md                          # Feature specification
├── plan.md                          # This file
├── research.md                      # Phase 0 research findings (TBD)
├── data-model.md                    # Phase 1 data model details (TBD)
├── contracts/                       # Phase 1 API contracts
│   ├── editor-api.openapi.yaml      # Editor backend API spec
│   └── dsl-grammar.md               # DSL syntax specification
├── quickstart.md                    # Phase 1 getting started guide (TBD)
├── checklists/
│   └── requirements.md              # Quality checklist
└── tasks.md                         # Phase 2 task breakdown (TBD via /sp.tasks)
```

### Source Code (monorepo structure)

```text
# Backend Services
backend/
├── editor-api/                      # Main editor API service (FastAPI)
│   ├── src/
│   │   ├── main.py
│   │   ├── models/
│   │   │   ├── file.py
│   │   │   ├── service.py
│   │   │   ├── model.py
│   │   │   ├── operation.py
│   │   │   └── error.py
│   │   ├── services/
│   │   │   ├── file_service.py
│   │   │   ├── parser_service.py
│   │   │   └── export_service.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── files.py
│   │   │   │   ├── parse.py
│   │   │   │   └── export.py
│   │   │   └── middleware.py (auth, logging, tracing)
│   │   └── db/
│   │       ├── database.py
│   │       ├── models.py (SQLAlchemy ORM)
│   │       └── migrations/ (Alembic)
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── contract/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yaml
│
├── dsl-parser/                      # DSL parser service (could be shared library)
│   ├── src/
│   │   ├── parser.py                # ANTLR4 or hand-written parser
│   │   ├── lexer.py
│   │   ├── validator.py
│   │   ├── ast.py                   # Abstract Syntax Tree definitions
│   │   └── errors.py
│   └── tests/
│
└── migrations/                      # Shared database schemas
    └── versions/

# Frontend (SPA)
frontend/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── EditorPane.tsx
│   │   │   ├── PreviewPane.tsx
│   │   │   ├── SplitLayout.tsx
│   │   │   └── FileManager.tsx
│   │   ├── Editor/Autocomplete.tsx
│   │   ├── Editor/ErrorPanel.tsx
│   │   └── common/
│   ├── pages/
│   │   ├── EditorPage.tsx
│   │   └── FilesPage.tsx
│   ├── services/
│   │   └── editorApi.ts             # API client
│   ├── hooks/
│   │   ├── useEditor.ts
│   │   ├── useParser.ts
│   │   └── useFileManager.ts
│   ├── store/ (Redux/TanStack Query)
│   │   ├── editorSlice.ts
│   │   └── filesSlice.ts
│   ├── types/
│   │   └── dsl.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile

# Infrastructure
k8s/
├── editor-api-deployment.yaml
├── editor-api-service.yaml
├── postgres-statefulset.yaml
├── configmaps.yaml
└── secrets.yaml (git-ignored)

docker-compose.yaml                 # Local dev environment
```

**Structure Decision**: Web application (Option 2 adapted) with separate backend microservices (FastAPI) and frontend SPA (React/TypeScript). Backend split into editor-api (main service) and dsl-parser (reusable library). Kubernetes-ready with Docker. Follows twelve-factor app principles and cloud-native patterns per Constitutional Principle XIII.

## Implementation Approach

### Phase 1: Core Infrastructure & MVP

1. **Backend Setup** (Editor API)
   - FastAPI project scaffold with async support
   - SQLAlchemy ORM + PostgreSQL integration
   - File CRUD endpoints
   - Parse & Validate endpoints (basic DSL parsing)
   - OpenAPI docs auto-generated
   - Docker containerization
   - Health checks & readiness probes

2. **DSL Parser (Minimal MVP)**
   - Hand-written recursive descent parser (simpler than ANTLR4 for MVP)
   - Tokenizer/Lexer for DSL keywords
   - AST representation for Service, Model, Operation, Error
   - Basic validation (required fields, type checking)
   - Error reporting (line, column, message)
   - Export to JSON/YAML

3. **Frontend Setup (React + TypeScript)**
   - React 18 app scaffold (Vite for speed)
   - Monaco Editor or CodeMirror 6 integration
   - Split-pane layout (React Resizable for divider)
   - API client (TanStack Query for data fetching)
   - Redux or TanStack Store for editor state
   - Real-time validation via WebSocket or polling

4. **Integration & Testing**
   - Contract tests (editor API OpenAPI compliance)
   - Unit tests for parser, validation logic
   - Integration tests (E2E: create file → save → edit → parse → preview)
   - Playwright for frontend E2E tests

### Phase 2: Observability & Advanced Features

1. **Observability** (Prometheus, ELK, Distributed Tracing)
   - Metrics: request latency, parse duration, validation errors
   - Logs: structured logging (JSON format) to ELK
   - Tracing: OpenTelemetry integration (editor-api → dsl-parser)
   - Health/readiness endpoints
   - Grafana dashboards

2. **Service Mesh Integration** (Istio)
   - VirtualService & DestinationRule for editor-api
   - PeerAuthentication for mTLS
   - RequestAuthentication (JWT validation)
   - Rate limiting policies
   - Distributed tracing sidecar injection

3. **P2 Features** (deferred)
   - Security constraint definitions
   - Collaboration (real-time co-editing via CRDT or Operational Transform)
   - Autocomplete refinement (context-aware suggestions)
   - Advanced validation rules

## Complexity Tracking

> No Constitution violations. MVP scope is tightly bounded (Service, Model, Operation, Error only). Security deferred per Constitutional Principle I.A.

## Notes

- **TDD Approach**: All implementation tasks include unit test + integration test requirements
- **CLI Automation**: Prefer shell scripts for setup (Docker Compose, Kubernetes apply)
- **Context7 MCP**: For documentation lookups on FastAPI, React, OpenAPI, Kubernetes best practices
- **Markdown DSL**: Example syntax to be defined in Phase 0 research/Phase 1 contracts
- **Performance Testing**: Include latency benchmarks for editor responsiveness targets

---

**Status**: ✅ Ready for Phase 0 Research
**Next Command**: `/sp.tasks` (Phase 2 task breakdown after research complete)
