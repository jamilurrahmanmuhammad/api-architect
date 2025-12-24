# ADR-0007: Backend Microservices Architecture with FastAPI and Python

> **Scope**: Backend technology stack (language, framework, database, ORM, async runtime) selected as integrated system for Feature 002 Requirements Grammar Authoring Studio.

- **Status:** Accepted
- **Date:** 2025-12-11
- **Feature:** 002-requirements-grammar
- **Context:** Feature 002 requires a cloud-native, microservices-oriented backend capable of real-time parsing, validation, and file persistence with observability as a first-class citizen. Backend must support async operations for concurrent editor sessions, handle REST API requests efficiently, and integrate with Kubernetes infrastructure per Constitutional Principle XIII.

## Decision

**Selected Backend Stack**:
- **Language/Runtime**: Python 3.11+ (async-capable, rich ecosystem)
- **Framework**: FastAPI (async-first, automatic OpenAPI docs, pydantic validation)
- **Database**: PostgreSQL 15 (ACID transactions, JSON support, established ecosystem)
- **ORM**: SQLAlchemy (declarative schema, migration support via Alembic)
- **Async Runtime**: asyncio (built-in Python standard library)
- **Testing**: pytest, pytest-asyncio (industry standard for Python)
- **Package Management**: pip/venv or Poetry (reproducible builds)

## Consequences

### Positive

- **Async Native**: FastAPI is async-first → high concurrency for simultaneous editor sessions with minimal resource overhead
- **Developer Productivity**: FastAPI auto-generates OpenAPI/Swagger docs, reducing documentation maintenance burden
- **Type Safety**: Pydantic models provide runtime validation and IDE autocompletion for API schemas
- **Data Integrity**: PostgreSQL ACID guarantees and SQLAlchemy ORM reduce data corruption risks
- **Observability Integration**: FastAPI middleware ecosystem enables easy OpenTelemetry, structured logging, metrics integration
- **Cloud Native**: Containerizable Python services, Kubernetes-friendly, observability-ready
- **Open Source**: All components are open-source (per Constitutional Principle XIII)
- **Microservices Ready**: FastAPI lightweight enough for multiple independent services (editor-api, parser-service, storage-service)

### Negative

- **Python Performance**: Slower than Go/Rust for CPU-intensive parsing (mitigated by hand-written parser for MVP scope)
- **GIL Limitation**: Global Interpreter Lock limits true multiprocessing (acceptable for I/O-bound editor API)
- **Ecosystem Fragmentation**: Multiple async web frameworks competing (FastAPI chosen as most modern)
- **Team Expertise**: Requires Python-proficient engineers (assumed available per project context)
- **Startup Time**: Python slower to start than compiled languages (acceptable for long-running containers)

## Alternatives Considered

**Alternative A: Node.js + Express/NestJS + PostgreSQL**
- Pros: Single language across frontend/backend, vast npm ecosystem, excellent async support
- Cons: Less type safety without TypeScript everywhere, higher memory footprint, potential npm package supply chain risks
- Rejected: Prefer separation of concerns (Python backend, TypeScript frontend); Python's data science ecosystem superior for future CIR transformations

**Alternative B: Go + Gin/Echo + PostgreSQL**
- Pros: Compiled performance, minimal dependencies, excellent concurrency (goroutines), cloud-native focus
- Cons: Less dynamic than Python, smaller ecosystem for API generation, steeper learning curve
- Rejected: FastAPI development velocity higher for MVP; Go chosen for Phase 2 parser optimization if needed

**Alternative C: Rust + Actix-web + PostgreSQL**
- Pros: Maximum performance, memory safety, compiled deployment
- Cons: Steep learning curve, slower development, compile times, smaller ecosystem
- Rejected: Overkill for MVP; Python/FastAPI faster to market

## References

- Feature Spec: [specs/002-requirements-grammar/spec.md](../../specs/002-requirements-grammar/spec.md)
- Implementation Plan: [specs/002-requirements-grammar/plan.md](../../specs/002-requirements-grammar/plan.md#technical-context)
- Constitution Principle XIII: [Cloud-Native & Deployment Requirements](.specify/memory/constitution.md#xiii-implementation--deployment-principles)
- Related ADRs: ADR-0009 (Database Persistence), ADR-0012 (Infrastructure & Observability)
