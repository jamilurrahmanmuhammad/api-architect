# ADR-0003: UI and Styling System

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together.

- **Status:** Accepted
- **Date:** 2025-12-10
- **Feature:** 001-core-framework-homepage
- **Context:** API Architect requires a flexible, themeable UI system supporting light/dark modes (FR-008 to FR-010), responsive layouts (320px-2560px per SC-006), and a persistent sidebar navigation (FR-004 to FR-007). The system must allow customization without vendor lock-in.

## Decision

Adopt the following integrated UI and styling approach:

- **CSS Framework**: Tailwind CSS 4 with native CSS variables
- **Component Library**: shadcn/ui (copy-paste model, not npm dependency)
- **Dark Mode**: Class-based toggle strategy (`document.documentElement.classList.toggle('dark')`)
- **Icons**: Lucide React for consistent iconography
- **Layout**: CSS Grid + Flexbox via Tailwind utilities

## Consequences

### Positive

- **Full Customization**: shadcn/ui copy-paste model means components live in codebase — no version lock-in
- **Theme Flexibility**: Tailwind CSS variables enable instant theme switching (<100ms per SC-003)
- **Built-in Sidebar**: shadcn/ui Sidebar component matches FR-004 to FR-007 requirements exactly
- **Responsive by Default**: Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) simplify viewport handling
- **Small Bundle**: Only used components included; no dead code from component library
- **Accessibility**: shadcn/ui built on Radix primitives with WCAG compliance

### Negative

- **Manual Updates**: shadcn/ui components don't auto-update — must manually copy new versions
- **Tailwind Learning Curve**: Utility-first CSS requires mindset shift from traditional CSS
- **Class Proliferation**: Complex components may have long class strings
- **Design System Maintenance**: Team responsible for consistency (no enforced design tokens)

## Alternatives Considered

**Alternative A: Chakra UI**
- Pros: Complete component library, built-in accessibility, dark mode support
- Cons: Bundle size (~100KB+), version lock-in, opinionated prop API
- Why rejected: Heavier than needed; less flexibility for custom designs

**Alternative B: Material UI (MUI)**
- Pros: Google's design system, comprehensive components, enterprise adoption
- Cons: Opinionated Material Design aesthetic, large bundle, theming complexity
- Why rejected: Material Design doesn't align with desired custom aesthetic

**Alternative C: Radix Primitives + Custom CSS**
- Pros: Maximum flexibility, minimal bundle, unstyled primitives
- Cons: Requires building every component from scratch, significant effort
- Why rejected: shadcn/ui already provides this with sensible defaults; reinventing the wheel

**Alternative D: CSS Modules + Custom Components**
- Pros: Scoped CSS, familiar traditional approach
- Cons: More boilerplate, no utility classes, slower iteration
- Why rejected: Tailwind utilities enable faster prototyping and consistent spacing/colors

## References

- Feature Spec: specs/001-core-framework-homepage/spec.md (FR-004 to FR-010, SC-003, SC-006)
- Implementation Plan: specs/001-core-framework-homepage/plan.md (Project Structure)
- Research: specs/001-core-framework-homepage/research.md (§3)
- Related ADRs: ADR-0001 (Frontend Stack), ADR-0004 (State Management for theme)
- Evaluator Evidence: Context7 docs `/websites/tailwindcss`, `/shadcn-ui/ui`
