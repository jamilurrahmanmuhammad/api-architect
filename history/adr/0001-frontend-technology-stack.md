# ADR-0001: Frontend Technology Stack

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect requires a modern, performant frontend for a SPA dashboard with public landing page, authenticated views, theme switching, and pluggable module navigation. The stack must support TDD methodology, fast development iteration, and future multi-tenant SaaS extensibility.

## Decision

Adopt the following integrated frontend technology stack:

- **Framework**: React 19 with concurrent rendering and automatic batching
- **Build Tool**: Vite 6 with native ESM, ~10ms HMR
- **Language**: TypeScript 5.x with strict mode
- **Routing**: React Router 7 with data loaders and type-safe routes
- **Runtime**: Node.js 20 LTS

## Consequences

### Positive

- **Fast Development Experience**: Vite's ~10ms HMR enables rapid TDD cycles (Red-Green-Refactor)
- **Modern React Features**: React 19's concurrent rendering improves perceived performance
- **Type Safety**: TypeScript throughout catches errors at compile time
- **Ecosystem Maturity**: Large community, extensive documentation, abundant learning resources
- **Data Loading**: React Router 7 loaders eliminate boilerplate for API data fetching
- **Future-Proof**: React Server Components foundation (when needed)

### Negative

- **React 19 Newness**: May encounter edge cases or breaking changes as ecosystem adapts
- **SPA Limitations**: No SSR/SSG out-of-box (mitigated: landing page is simple, SEO not critical)
- **Learning Curve**: Team members less familiar with Vite may need onboarding
- **Bundle Size**: Client-side React adds ~45KB gzipped minimum payload

## Alternatives Considered

**Alternative A: Next.js 14 (App Router) + Vercel**
- Pros: SSR/SSG built-in, excellent DX, integrated deployment
- Cons: Opinionated structure, heavier runtime, overkill for SPA dashboard
- Why rejected: Dashboard doesn't need server-side rendering; added complexity without benefit

**Alternative B: Remix + Cloudflare**
- Pros: Full-stack data loading, edge deployment
- Cons: Smaller ecosystem, less community support, steeper learning curve
- Why rejected: Less documentation and community resources for troubleshooting

**Alternative C: Vue 3 + Vite**
- Pros: Simpler learning curve, excellent reactivity system
- Cons: Smaller talent pool, team familiarity with React
- Why rejected: Team expertise is in React; switching adds unnecessary risk

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md
- Implementation Plan: specs/001-core-framework-homepage/plan.md (Technical Context section)
- Research: specs/001-core-framework-homepage/research.md (§1, §4)
- Related ADRs: ADR-0003 (UI/Styling), ADR-0004 (State Management), ADR-0005 (Testing)
- Evaluator Evidence: Context7 docs `/websites/react_dev_reference`, `/vitejs/vite`
