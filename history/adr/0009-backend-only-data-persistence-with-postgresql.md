# ADR-0009: Backend-Only Data Persistence with PostgreSQL

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2025-12-11
- **Feature:** 002-requirements-grammar
- **Context:** Feature 002 clarification (Q1) established "backend-only storage" as mandatory architectural constraint per constitutional requirements (cloud-native, microservices, collaboration support). Decision impacts data sync strategy, offline-capability, and collaboration roadmap.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

**Data Persistence Strategy**:
- **Storage Location**: Backend-only (PostgreSQL database on server, no local browser storage)
- **Database**: PostgreSQL 15 (ACID compliant, JSON support, mature ecosystem)
- **Versioning**: Auto-incrementing version field on RequirementFile; git-like diff storage for change tracking
- **No Local Cache**: No IndexedDB/localStorage fallback for MVP (simplifies state management)
- **Sync Strategy**: Immediate save on file changes (debounced 30s auto-save + manual Ctrl+S)
- **Offline**: Not supported in MVP (Phase 2 feature if needed)
- **Collaboration**: Version field enables future multi-user editing (CRDT/OT implementation in Phase 2)

<!-- For technology stacks, list all components:
     - Framework: Next.js 14 (App Router)
     - Styling: Tailwind CSS v3
     - Deployment: Vercel
     - State Management: React Context (start simple)
-->

## Consequences

### Positive

- **Single Source of Truth**: All data authoritative on backend; eliminates sync conflicts and data divergence between client/server
- **Simplified State Management**: Frontend becomes stateless renderer; no complex offline/online reconciliation logic, reduces bugs
- **Collaboration-Ready**: Version field enables future CRDT/Operational Transform (OT) implementations for concurrent editing (Phase 2)
- **Data Integrity**: PostgreSQL ACID guarantees + backend-only writes prevent data corruption from network failures or browser crashes
- **Security**: Sensitive data never transmitted to/cached in browser; reduces attack surface for XSS, local storage theft
- **Observability**: All mutations logged server-side; audit trail and change history built-in for compliance/debugging

### Negative

- **Offline Unsupported**: MVP has hard dependency on backend connectivity; users cannot author offline (Phase 2 mitigation with local cache + sync queue)
- **Latency Sensitivity**: Every keystroke → server round-trip; requires <500ms network latency for responsive UX (mitigated by 30s debounce + client-side validation)
- **Concurrency Complexity**: Simultaneous edits from multiple users will collision unless CRDT/OT implemented (Phase 2 feature)
- **Backend Load**: All read/write operations serialize through PostgreSQL; potential bottleneck at scale (mitigated by connection pooling, caching at API layer)

## Alternatives Considered

**Alternative A: Hybrid Storage (PostgreSQL + IndexedDB local cache)**
- Pros: Offline capability, reduced latency (<100ms local reads), UX feels responsive even with network jitter
- Cons: Complex sync protocol (CRDTs/OT needed), data divergence risk, increased client-side state management, browser storage limits (5-50MB)
- Rejected: Complexity not justified for MVP; Phase 2 can add this as enhancement. Backend-only simpler, aligns with cloud-native principle

**Alternative B: Distributed Consensus (PostgreSQL + Redis + event log)**
- Pros: Horizontal scalability, event sourcing enables audit trail, potential for offline queue
- Cons: Operational overhead (Redis cluster), eventual consistency complicates UX (stale reads), higher infrastructure cost
- Rejected: Over-engineered for MVP; PostgreSQL sufficient. Event sourcing can be added later as observability feature

**Alternative C: Document Database (MongoDB instead of PostgreSQL)**
- Pros: Schema flexibility, JSON-native (natural fit for nested RequirementFile structure), horizontal scaling
- Cons: Weaker ACID guarantees, version/change tracking less native, smaller ecosystem for Python/SQLAlchemy integration
- Rejected: PostgreSQL's JSON support + ACID transactions superior for data integrity requirements

## References

- Feature Spec: [specs/002-requirements-grammar/spec.md](../../specs/002-requirements-grammar/spec.md#data-persistence--offline)
- Implementation Plan: [specs/002-requirements-grammar/plan.md](../../specs/002-requirements-grammar/plan.md#data-model--persistence)
- Related ADRs: ADR-0007 (Backend Stack), ADR-0008 (Frontend Stack), ADR-0012 (Infrastructure)
- Constitution Principle I.A: [Cloud-Native & Data Requirements](.specify/memory/constitution.md#ia-interactive-dsl-authoring-studio)
