# ADR-0011: Real-Time Preview with Incremental Best-Effort Parsing

> **Scope**: Editor preview update strategy when user modifies DSL source code. Decision impacts UI responsiveness, error handling, and future collaboration features. Groups: (1) parsing strategy (full vs incremental), (2) error tolerance (strict vs best-effort), (3) update frequency (immediate vs debounced).

- **Status:** Accepted
- **Date:** 2025-12-11
- **Feature:** 002-requirements-grammar
- **Context:** Feature 002 requires split-pane editor/preview UI matching Swagger Editor UX. Editor must feel responsive (<200ms keystroke → preview update) even with parse errors. Users expect partial preview (show valid portions, skip invalid) rather than blank/frozen preview on syntax error. Decision impacts: backend parsing API contract (error response format), frontend state management (rendering invalid AST), latency budget allocation.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

**Strategy: Full-Document Best-Effort Parsing with Debounced Updates**
- **Parsing Scope**: Full-document re-parse on each significant change (MVP doesn't implement incremental state machine)
- **Error Tolerance**: Best-effort parsing—return partial AST with error annotations; preview shows valid entities + error markers
- **Update Frequency**: Debounced 300ms client-side (rapid keystroke bundling) + server debounce 30s (auto-save batch window)
- **Backend API**: `/parse` endpoint returns `{entities: [...], errors: [...], partial: true/false}` to indicate validity
- **Frontend Preview**: React component renders valid entities; displays inline error tooltips for syntax/semantic issues
- **Latency Budget**:
  - User keystroke → debounce 300ms
  - Network RTT ~150ms (typical)
  - Parse + validation ~50ms
  - React render + paint ~100ms
  - **Total: ~600ms** (acceptable, under <1s target)
- **Phase 2 Incremental**: Can optimize to incremental tokenization + AST diff if profiling shows bottleneck

## Consequences

### Positive

- **Responsive UX**: Debouncing + best-effort parsing keeps preview responsive even during error states; users see immediate visual feedback (valid entities, error highlighting)
- **Partial Recovery**: Invalid entity doesn't block preview of valid ones; users can see structure while fixing syntax
- **Simplified Architecture**: Full-document parse is stateless; no need for incremental state machine, easier to test and debug
- **Error Locality**: Line/column-precise errors guide users to exact problem (vs "document invalid" blocking entire preview)
- **Developer Experience**: Standard markdown syntax (familiar to API engineers); no special grammar learning curve

### Negative

- **Performance Ceiling**: Full-document re-parse on every keystroke; O(n) parse time scales with file size. Mitigated by <100KB MVP scope, 300ms debounce
- **Network Overhead**: Each debounce window triggers parse request; potential latency on slow connections (mitigated by local client-side syntax validation on Phase 2)
- **Stale Preview Risk**: 300ms debounce window means preview lags user input slightly (acceptable UX trade-off; Swagger Editor does similar)
- **Partial AST Complexity**: Frontend must handle "valid + errors" state (not just valid or all-invalid); complicates preview component logic

## Alternatives Considered

**Alternative A: Strict Validation (Parse fails → blank preview)**
- Pros: Simple API contract (parse succeeds or fails, binary), no partial state handling needed
- Cons: Terrible UX—any syntax error freezes preview until fixed; discourages exploration. Not acceptable for iterative authoring
- Rejected: Violates Swagger Editor UX parity requirement; users expect graceful degradation

**Alternative B: Incremental Tokenization + Windowed Re-parse**
- Pros: Only re-parse changed region; O(k) complexity where k = changed window size; faster for large files
- Cons: Complex state machine, harder to test, requires memoization of AST, risky for concurrent edits (Phase 2)
- Rejected: Over-engineered for MVP <100KB file scope. Can adopt Phase 2 if profiling shows bottleneck

**Alternative C: Client-Side Parse (no backend required)**
- Pros: Zero network latency, fully offline-capable, instant feedback
- Cons: Parser code duplication (Python backend + JavaScript frontend), harder to maintain, larger bundle, browser performance variable
- Rejected: Violates DRY principle; parser complexity justifies server-side implementation. Phase 2 can add client-side cache layer

## References

- Feature Spec: [specs/002-requirements-grammar/spec.md](../../specs/002-requirements-grammar/spec.md#real-time-preview)
- Implementation Plan: [specs/002-requirements-grammar/plan.md](../../specs/002-requirements-grammar/plan.md#editor-api-contracts)
- Related ADRs: ADR-0010 (Parser Strategy), ADR-0008 (Frontend Stack), ADR-0007 (Backend Stack)
- Constitution Principle I.A: [Real-Time Validation & Preview](.specify/memory/constitution.md#ia-interactive-dsl-authoring-studio)
