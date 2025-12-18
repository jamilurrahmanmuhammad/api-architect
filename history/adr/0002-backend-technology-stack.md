# ADR-0002: Backend Technology Stack

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together.

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect requires a performant, async-capable backend for serving module configuration, health checks, and authentication shell. The stack must support TDD, automatic OpenAPI documentation (Constitution Principle VI), and future multi-tenant SaaS extensibility with potential for high concurrency.

## Decision

Adopt the following integrated backend technology stack:

- **Language**: Python 3.12 with latest type hints
- **Framework**: FastAPI 0.115+ with async/await first-class support
- **Validation**: Pydantic 2.x for request/response models
- **Server**: uvicorn with ASGI for async request handling
- **Logging**: structlog for structured JSON logging with correlation IDs (FR-024, FR-026)
- **Containerization**: Docker with multi-stage builds

## Consequences

### Positive

- **Automatic API Docs**: FastAPI generates OpenAPI 3.1 spec automatically, satisfying Constitution Principle VI
- **High Performance**: Async-first architecture handles concurrent requests efficiently
- **Type Safety**: Pydantic 2.x provides runtime validation with excellent TypeScript-like DX
- **Testability**: Dependency injection system enables clean TDD with mocked dependencies
- **Correlation IDs**: structlog + middleware provides request tracing for observability
- **Hot Reload**: uvicorn --reload enables rapid development iteration

### Negative

- **Python GIL**: CPU-bound operations may bottleneck (mitigated: API is I/O-bound)
- **Async Complexity**: Developers must understand async/await patterns
- **Less Enterprise Adoption**: FastAPI less common than Django in large enterprises
- **Memory Footprint**: Python processes consume more RAM than Go/Rust alternatives

## Alternatives Considered

**Alternative A: Django + Django REST Framework**
- Pros: Mature ecosystem, battle-tested, extensive documentation
- Cons: Synchronous by default, heavier ORM, slower for simple APIs
- Why rejected: Overkill for stateless API; FastAPI is 3-5x faster for async workloads

**Alternative B: Flask + Connexion**
- Pros: Minimal, OpenAPI-first with Connexion
- Cons: No async, requires many extensions, less structured
- Why rejected: Lacks built-in async support; would need to add too many dependencies

**Alternative C: Node.js + Express/Fastify**
- Pros: Single language (TypeScript) across stack, excellent async
- Cons: Less structured, type validation not built-in, team Python expertise
- Why rejected: Team has stronger Python expertise; separate language for backend enables specialized optimization

**Alternative D: Go + Gin**
- Pros: Compiled performance, small memory footprint
- Cons: Less rapid prototyping, verbose error handling
- Why rejected: Development speed more important than raw performance at current scale

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md (FR-024 to FR-028)
- Implementation Plan: specs/001-core-framework-homepage/plan.md (Technical Context section)
- Research: specs/001-core-framework-homepage/research.md (§5, §7)
- Related ADRs: ADR-0005 (Testing Strategy)
- Evaluator Evidence: Context7 docs `/fastapi/fastapi`
