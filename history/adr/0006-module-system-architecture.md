# ADR-0006: Module System Architecture

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together.

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect requires a pluggable module system where new features (Features 2-20) can be added without code changes to the dashboard or navigation (FR-016 to FR-019). The system must support enabling/disabling modules and dynamic ordering, satisfying Constitution Principle XII (Extensibility Architecture).

## Decision

Adopt the following configuration-driven module system:

- **Configuration Format**: YAML files for module definitions
- **Storage**: Backend serves module configuration via REST API (`GET /api/v1/modules`)
- **Frontend Consumption**: moduleStore fetches and caches configuration; components render from cache
- **Module Schema**: id, name, description, icon, route, enabled, order
- **Hot Reload**: Development mode watches YAML for changes (optional enhancement)

## Consequences

### Positive

- **No Code Changes**: Adding a module requires only YAML entry — no recompilation or redeployment
- **Version Controllable**: YAML files tracked in git; changes auditable
- **Human Readable**: Non-developers can understand and modify module configuration
- **Centralized Control**: Backend owns module definitions; frontend is a pure consumer
- **Enable/Disable**: Simple boolean flag controls module visibility without code removal
- **Ordering**: Numeric order field controls display sequence

### Negative

- **No Dynamic Loading**: Module code must still be deployed; only metadata is dynamic
- **Schema Evolution**: Changes to module schema require migration of existing YAML
- **Validation Gap**: Invalid YAML silently fails unless explicitly validated
- **Single Point of Failure**: If modules API fails, dashboard shows empty state

## Alternatives Considered

**Alternative A: Code-Based Registration (Plugin Pattern)**
- Pros: Full dynamic loading, code-level extensibility, lazy loading
- Cons: Complex plugin infrastructure, security concerns, harder to audit
- Why rejected: Overkill for current scope; metadata-only pluggability sufficient

**Alternative B: Database-Stored Configuration**
- Pros: Admin UI for changes, no file deployment needed
- Cons: Requires database, admin interface, migration complexity
- Why rejected: Premature optimization; YAML is simpler for current single-user development

**Alternative C: JSON Configuration**
- Pros: Native JavaScript/Python parsing, widely supported
- Cons: No comments, less readable for humans, stricter syntax
- Why rejected: YAML allows comments and is more readable for configuration

**Alternative D: Environment Variables**
- Pros: 12-factor app compliance, easy runtime changes
- Cons: Not suited for complex nested structures like module definitions
- Why rejected: Module schema too complex for flat environment variables

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md (FR-016 to FR-019)
- Implementation Plan: specs/001-core-framework-homepage/plan.md (Project Structure, modules.yaml)
- Research: specs/001-core-framework-homepage/research.md (§8)
- Constitution: Principle XII (Extensibility Architecture)
- Related ADRs: ADR-0002 (Backend serves config), ADR-0004 (moduleStore caches config)
- Evaluator Evidence: N/A — standard pattern
