# ADR-0010: DSL Parsing Strategy – Hand-Written Parser vs ANTLR4

> **Scope**: Parser implementation approach for Requirements Grammar DSL (markdown-based syntax). Decision impacts development velocity, code maintainability, error reporting quality, and extensibility for Phase 2 enhancements.

- **Status:** Accepted
- **Date:** 2025-12-11
- **Feature:** 002-requirements-grammar
- **Context:** Feature 002 requires parsing markdown-based DSL (Service, Model, Operation, Error entities with markdown headers, tables, code blocks). Parser must support real-time incremental parsing for editor preview, provide precise error locations for syntax validation, and enable future phases (Security policies, transformations). Decision impacts architecture: ANTLR4 provides generated parser + visitor pattern, hand-written offers control + simplicity for MVP scope.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

**Selected Approach: Hand-Written Recursive Descent Parser**
- **Implementation**: Python 3.11+ with custom recursive descent parser (no code generation)
- **Syntax**: Markdown-based (GitHub Flavored Markdown compatible)
- **Error Handling**: Line/column-precise error messages with recovery for partial documents
- **Incremental Parsing**: Stateless parse-on-demand (re-parse full document each time) for MVP; Phase 2 can add incremental state machine
- **Validation**: Semantic validation layer separate from syntax parser (allows syntax errors without blocking preview)
- **Extensibility**: Parser structure allows adding new entity types (Security, Transformation phases) without regenerating code
- **Testing**: Hand-written tests using pytest with snapshot-based golden files

## Consequences

### Positive

- **Development Velocity**: No build step for parser (no grammar → code generation); rapid iteration on syntax/error messages during MVP
- **Maintainability**: Code is explicit and readable (vs generated parser boilerplate); team can understand and modify logic directly
- **Error Messages**: Full control over error formatting; can provide context-specific hints (e.g., "Expected '## Model' header" vs generic parse error)
- **Debugging**: Traditional Python debugging (breakpoints, stack traces) beats generated code with indirection layers
- **Lightweight**: No ANTLR runtime dependency; parser module ~500 LOC, minimal memory footprint for embedded usage
- **Markdown Compatibility**: GFM syntax naturally maps to markdown parsing (headings, tables, code blocks); no grammar mismatch

### Negative

- **Complexity Risk**: Recursive descent parser error recovery requires careful state management; potential for subtle bugs (mitigated by comprehensive test coverage)
- **Scaling Limitation**: Hand-written parser slower than ANTLR4 generated code; O(n) for large files (MVP constraint: files <100KB assumed acceptable)
- **No IDE Support**: ANTLR4 integrates with IDE plugins; hand-written requires custom editor support (Phase 2 enhancement)
- **Extensibility Ceiling**: Adding grammar features (e.g., nested blocks, conditional syntax Phase 2) requires parser refactoring (ANTLR4 would just change grammar)

## Alternatives Considered

**Alternative A: ANTLR4 (Python target)**
- Pros: Mature grammar-driven approach, auto-generates lexer+parser, visitor pattern for AST traversal, IDE plugins available
- Cons: Build step required (grammar → Python code), generated code harder to debug, grammar learning curve, file size overhead (~5-10x larger)
- Rejected: Overkill for MVP markdown DSL scope; hand-written simpler and faster to implement. ANTLR4 can be adopted Phase 2 if grammar complexity warrants

**Alternative B: Lark Parser (Python PEG parser)**
- Pros: Python-native PEG syntax (readable), automatic AST generation, no code generation needed
- Cons: PEG less intuitive than grammar, indirect error recovery, additional runtime dependency (slower than hand-written)
- Rejected: Hand-written offers more control for real-time partial parsing; Lark adds runtime overhead

**Alternative C: Using External Markdown Parser (python-markdown + custom AST walker)**
- Pros: Leverage mature markdown parser, reduce custom parsing code
- Cons: Markdown parsers expect full document; incremental parsing harder to achieve, metadata extraction (entity types) still requires custom logic
- Rejected: Partial solution; still need custom layer for DSL semantics. Hand-written more direct

## References

- Feature Spec: [specs/002-requirements-grammar/spec.md](../../specs/002-requirements-grammar/spec.md#dsl-syntax-definitions)
- Implementation Plan: [specs/002-requirements-grammar/plan.md](../../specs/002-requirements-grammar/plan.md#dsl-parser-architecture)
- Related ADRs: ADR-0007 (Backend Stack), ADR-0011 (Real-time Preview), ADR-0008 (Frontend Stack)
- Constitution Principle I.A: [DSL Authoring Scope](.specify/memory/constitution.md#ia-interactive-dsl-authoring-studio)
