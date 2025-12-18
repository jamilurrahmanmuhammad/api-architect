# ADR-0004: State Management Approach

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together.

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect requires client-side state management for theme preferences (FR-009 persistence), authentication state (FR-012), and module configuration caching. State must persist across sessions for theme and support efficient updates without unnecessary re-renders.

## Decision

Adopt the following integrated state management approach:

- **Library**: Zustand for global state stores
- **Persistence**: Zustand `persist` middleware with `localStorage` for theme preference
- **Store Pattern**: Separate stores per domain (themeStore, authStore, moduleStore)
- **Hydration**: No SSR — stores initialize client-side only

## Consequences

### Positive

- **Minimal Boilerplate**: ~3x less code than Redux Toolkit for equivalent functionality
- **TypeScript-First**: Excellent type inference without manual typing
- **No Providers**: Direct store subscription without React Context wrapper components
- **Built-in Persistence**: `persist` middleware handles localStorage serialization automatically
- **Selective Subscriptions**: Components only re-render when subscribed state changes
- **DevTools Support**: Works with Redux DevTools for debugging

### Negative

- **Less Structure**: No enforced patterns (actions, reducers) — requires discipline
- **Smaller Community**: Less documentation and fewer tutorials than Redux
- **Migration Risk**: If app grows significantly, may need to reconsider (mitigated: current scope is small)
- **Testing Nuance**: Store testing requires mocking Zustand's create function

## Alternatives Considered

**Alternative A: Redux Toolkit**
- Pros: Industry standard, extensive ecosystem, enforced patterns, excellent DevTools
- Cons: Significant boilerplate, slices/reducers/actions overhead, provider wrapping
- Why rejected: Overkill for current complexity; Zustand handles all use cases with less code

**Alternative B: Jotai**
- Pros: Atomic state model, minimal API, excellent for derived state
- Cons: Less structured for larger stores, different mental model
- Why rejected: Prefer store pattern over atomic model for this application structure

**Alternative C: React Context + useReducer**
- Pros: Built-in to React, no dependencies
- Cons: Re-render issues on context changes, no built-in persistence
- Why rejected: Performance concerns with frequent theme/auth state updates

**Alternative D: TanStack Query (for server state)**
- Pros: Excellent for server state, caching, background refresh
- Cons: Not suited for client-only state like theme preference
- Why rejected: Complements rather than replaces client state; may add later for API caching

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md (FR-009, FR-012)
- Implementation Plan: specs/001-core-framework-homepage/plan.md (Storage section)
- Research: specs/001-core-framework-homepage/research.md (§2)
- Related ADRs: ADR-0001 (Frontend Stack), ADR-0003 (UI System for theme toggle)
- Evaluator Evidence: Context7 docs `/pmndrs/zustand`
