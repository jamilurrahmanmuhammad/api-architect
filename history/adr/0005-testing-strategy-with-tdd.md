# ADR-0005: Testing Strategy with TDD

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together.

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect mandates Test-Driven Development (TDD) per Constitution Principle X. The testing infrastructure must support the Red-Green-Refactor cycle with fast feedback loops, contract testing for OpenAPI compliance, and 80%+ coverage targets.

## Decision

Adopt the following integrated testing strategy:

**Frontend:**
- **Test Runner**: Vitest with jsdom environment
- **Component Testing**: React Testing Library for user-centric tests
- **API Mocking**: MSW (Mock Service Worker) for network request interception
- **Coverage**: v8 provider with 80% threshold enforcement

**Backend:**
- **Test Runner**: pytest with pytest-asyncio for async tests
- **API Testing**: httpx AsyncClient with ASGI transport
- **Contract Testing**: Schemathesis or custom OpenAPI compliance tests
- **Coverage**: pytest-cov with 80% threshold enforcement

**Methodology:**
- **TDD Cycle**: RED (failing test) → GREEN (minimal implementation) → REFACTOR
- **Test Categories**: Unit (90% target), Integration (80% target), Contract (100% target)

## Consequences

### Positive

- **Fast Feedback**: Vitest runs in ~100ms for incremental tests; enables rapid TDD cycles
- **User-Centric Tests**: RTL encourages testing behavior, not implementation details
- **Real Network Mocking**: MSW intercepts at network level — tests mirror production behavior
- **Contract Confidence**: OpenAPI compliance tests ensure API matches documentation
- **Coverage Gates**: 80% threshold prevents regression; enforced in CI
- **Parallel Execution**: Both Vitest and pytest support parallel test execution

### Negative

- **Setup Overhead**: MSW and pytest fixtures require initial configuration
- **Test Maintenance**: Comprehensive tests require ongoing maintenance as features evolve
- **TDD Discipline**: Requires team commitment to write tests first (culture shift)
- **False Confidence**: High coverage doesn't guarantee correctness — quality matters

## Alternatives Considered

**Alternative A: Jest + Supertest (Frontend + Backend)**
- Pros: Single test runner philosophy, widely known
- Cons: Jest slower than Vitest, Supertest for Express (not FastAPI)
- Why rejected: Vitest is ~10x faster; pytest is Python-native

**Alternative B: Cypress for E2E + Unit Tests**
- Pros: Visual testing, real browser, unified tool
- Cons: Slow for unit tests, heavy setup, not suited for TDD rapid cycles
- Why rejected: TDD requires sub-second feedback; Cypress is for E2E (may add later)

**Alternative C: unittest + requests (Backend)**
- Pros: Built-in to Python, simple
- Cons: Verbose, no async support, less ergonomic assertions
- Why rejected: pytest-asyncio is essential for FastAPI async handlers

**Alternative D: Testing Library only (no MSW)**
- Pros: Simpler setup, mock at module level
- Cons: Module mocks couple tests to implementation, miss network edge cases
- Why rejected: MSW provides realistic network simulation without implementation coupling

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md (SC-001 to SC-010)
- Implementation Plan: specs/001-core-framework-homepage/plan.md (TDD Strategy section)
- Research: specs/001-core-framework-homepage/research.md (§6)
- Constitution: Principle X (Testing Artefact Generation)
- Related ADRs: ADR-0001 (Frontend), ADR-0002 (Backend)
- Evaluator Evidence: Context7 docs `/vitest-dev/vitest`, `/testing-library`, `/pytest-dev/pytest`
