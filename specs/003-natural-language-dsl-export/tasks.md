# Task Breakdown: Natural Language DSL & OpenAPI Export

**Feature**: 003-natural-language-dsl-export
**Branch**: `003-natural-language-dsl-export`
**Date**: 2025-12-13
**Plan Reference**: [plan.md](plan.md)
**Spec Reference**: [spec.md](spec.md)

## Overview

This document breaks down the Natural Language DSL & OpenAPI Export implementation into granular, dependency-ordered, independently testable tasks.

**Approach**: Test-Driven Development (TDD) - Tests defined first, implementation follows
**Execution Strategy**: Parser Refactor -> Export Backend -> Frontend UI -> Integration

---

## Executive Summary

- **Total Tasks**: 24
- **Phase 1 (Parser Refactor)**: 8 tasks
- **Phase 2 (Export Backend)**: 8 tasks
- **Phase 3 (Frontend UI)**: 5 tasks
- **Phase 4 (Integration)**: 3 tasks

---

## Phase 1: Parser Refactoring

*Update DSL parser to accept natural language syntax, remove table syntax*

### 1.1 Lexer Updates

- [x] T001 Write unit tests for LIST_ITEM token recognition in `backend/dsl-parser/tests/test_lexer_list.py`
  - Test: `- field (type)` produces LIST_ITEM token
  - Test: `- field (type, required)` produces LIST_ITEM token
  - Test: `- field (type) - description` produces LIST_ITEM token with description

- [x] T002 Add LIST_ITEM token type and lexer pattern in `backend/dsl-parser/src/lexer.py`
  - Add `LIST_ITEM = auto()` to TokenType enum
  - Add pattern: `^-\s+(\w+)\s*\(([^)]+)\)(?:\s*-\s*(.*))?$`
  - Store field name, type info, and description in token value

- [x] T003 Remove TABLE_SEPARATOR and table-related token handling from lexer
  - Remove TABLE_SEPARATOR token type
  - Remove TABLE_ROW_PATTERN matching
  - Add error token for `|` at start of line (migration hint)

### 1.2 Parser Updates

- [x] T004 Write unit tests for natural language field parsing in `backend/dsl-parser/tests/test_parser_natural.py`
  - Test: Parse model with list-based fields
  - Test: Parse required vs optional fields
  - Test: Parse fields with descriptions
  - Test: Parse array types (e.g., `string[]`, `Pet[]`)
  - Test: Parse model references (e.g., `Category`)

- [x] T005 Implement `_parse_list_fields()` method in `backend/dsl-parser/src/parser.py`
  - Parse LIST_ITEM tokens into FieldNode objects
  - Extract field name, type, required flag, description
  - Handle array types (convert `Type[]` to array of Type)
  - Handle model references

- [x] T006 Update `_parse_model()` to use list syntax instead of tables in `backend/dsl-parser/src/parser.py`
  - Call `_parse_list_fields()` instead of `_parse_field_table()`
  - Remove `_parse_field_table()` method
  - Add migration error for table syntax detection

- [x] T007 Update FieldNode in `backend/dsl-parser/src/dsl_ast.py` to include description
  - Add `description: Optional[str]` field (already present)
  - Update `__init__` and dataclass

- [x] T008 Write integration tests for complete natural language DSL parsing in `backend/dsl-parser/tests/test_integration_natural.py`
  - Test: Full spec with service, models, operations, errors
  - Test: Migration error message for table syntax
  - Test: Complex model relationships (references, arrays)

---

## Phase 2: Export Service (Backend)

*Create OpenAPI export functionality*

### 2.1 Example Generator

- [x] T009 Write unit tests for example value generator in `backend/editor-api/tests/unit/test_example_generator.py`
  - Test: `id` field -> integer example (1)
  - Test: `name` field -> string example ("John Doe")
  - Test: `email` field -> email example
  - Test: `*_url` field -> URL example
  - Test: `is_*` field -> boolean example
  - Test: `*_at` field -> datetime example
  - Test: array types -> array examples

- [x] T010 Create ExampleGenerator class in `backend/editor-api/src/utils/example_generator.py`
  - Pattern-based example generation
  - Type-based fallbacks
  - Support for array examples

### 2.2 OpenAPI Generator

- [x] T011 Write unit tests for OpenAPI generator in `backend/editor-api/tests/unit/test_openapi_generator.py`
  - Test: Service -> info + servers
  - Test: Model -> components/schemas
  - Test: Model fields -> properties with examples
  - Test: Required fields -> required array
  - Test: Operation -> paths entry
  - Test: Operation parameters -> parameters array
  - Test: Operation body -> requestBody
  - Test: Operation returns -> responses
  - Test: Error -> components/responses

- [x] T012 Create OpenAPIGenerator class in `backend/editor-api/src/utils/openapi_generator.py`
  - `generate(parsed: ParsedRequirements, version: str) -> dict`
  - `_build_info(service: ServiceNode) -> dict`
  - `_build_servers(service: ServiceNode) -> list`
  - `_build_paths(operations: list[OperationNode]) -> dict`
  - `_build_schemas(models: list[ModelNode]) -> dict`
  - `_build_responses(errors: list[ErrorNode]) -> dict`

- [x] T013 Add support for OpenAPI 3.1 differences in generator
  - Use `examples` instead of `example` where appropriate
  - Handle JSON Schema differences

### 2.3 Export Service & API

- [x] T014 Write contract tests for POST /export endpoint in `backend/editor-api/tests/contract/test_export_api.py`
  - Test: Export to OpenAPI 3.0 YAML
  - Test: Export to OpenAPI 3.0 JSON
  - Test: Export to OpenAPI 3.1 YAML
  - Test: Error handling for invalid content
  - Test: Response headers (Content-Disposition for download)

- [x] T015 Create ExportService in `backend/editor-api/src/services/export_service.py`
  - `export_openapi(content: str, format: str, version: str) -> str`
  - Parse content, generate OpenAPI, serialize to YAML/JSON
  - Handle errors gracefully

- [x] T016 Implement POST /export endpoint in `backend/editor-api/src/api/routes/export.py`
  - Request body: `{ content: string, format: "yaml"|"json", version: "3.0"|"3.1" }`
  - Response: OpenAPI spec with appropriate Content-Type
  - Add to router in `main.py`

---

## Phase 3: Frontend UI

*Create export dialog and integrate into editor*

### 3.1 Export Hook & Service

- [x] T017 Write unit tests for useExport hook in `frontend/tests/unit/hooks/useExport.test.ts`
  - Test: Export triggers API call
  - Test: Loading state during export
  - Test: Error handling
  - Test: Download triggers

- [x] T018 Create export service and hook in `frontend/src/hooks/useExport.ts`
  - `exportToOpenAPI(content: string, format: string, version: string)`
  - Return { export, isExporting, error }
  - Trigger file download on success

### 3.2 Export UI Components

- [x] T019 Write unit tests for ExportDialog component in `frontend/tests/unit/components/ExportDialog.test.tsx`
  - Test: Renders format options (YAML, JSON)
  - Test: Renders version options (3.0, 3.1)
  - Test: Export button triggers export
  - Test: Cancel closes dialog
  - Test: Loading state during export

- [x] T020 Create ExportDialog component in `frontend/src/components/Editor/ExportDialog.tsx`
  - Format selector: YAML (default), JSON
  - Version selector: 3.0.3 (default), 3.1.0
  - Export button with loading state
  - Cancel button

- [x] T021 Add Export button to EditorPage toolbar in `frontend/src/pages/EditorPage.tsx`
  - Add "Export" button next to Save button
  - Open ExportDialog on click
  - Pass current editor content to dialog

---

## Phase 4: Integration & Validation

*End-to-end testing and validation*

### 4.1 E2E Tests

- [x] T022 Write E2E test for export flow in `frontend/tests/e2e/export_openapi.spec.ts`
  - Test: Write DSL -> Export -> Download file ✓
  - Test: Exported file has correct content ✓
  - Test: Export with different format options ✓

- [x] T023 Write E2E test for natural language DSL in `frontend/tests/e2e/natural_language_dsl.spec.ts`
  - Test: Write natural language spec -> Preview shows entities ✓
  - Test: List syntax fields appear in Models tab ✓
  - Test: Operations with parameters appear correctly ✓

### 4.2 Validation

- [x] T024 Validate exported OpenAPI against specification
  - Use openapi-spec-validator or similar tool ✓
  - Test exported specs in Swagger Editor ✓
  - Document any limitations or edge cases ✓

---

## Dependencies & Execution Order

### Critical Path:
1. T001-T003: Lexer updates (required for parser)
2. T004-T008: Parser updates (required for export)
3. T009-T010: Example generator (required for OpenAPI)
4. T011-T013: OpenAPI generator (required for export service)
5. T014-T016: Export API (required for frontend)
6. T017-T021: Frontend UI
7. T022-T024: Integration tests

### Parallelizable:
- T009-T010 (Example generator) can run parallel with T004-T008 (Parser)
- T017-T018 (Frontend hook) can run parallel with T019-T020 (UI components)

---

## Testing Strategy

### Unit Tests
- Backend: pytest for parser, generators, services
- Frontend: Vitest for hooks and components
- Target: >80% coverage

### Contract Tests
- OpenAPI endpoint compliance
- Request/response format validation

### E2E Tests
- Full export workflow
- Natural language DSL authoring

### Validation Tests
- OpenAPI spec validation
- Swagger Editor compatibility

---

## Definition of Done

- [x] Natural language DSL syntax fully supported
- [x] Table syntax removed with migration error messages
- [x] OpenAPI 3.0 and 3.1 export working
- [x] YAML and JSON formats supported
- [x] Example values auto-generated
- [x] Export UI in editor toolbar
- [x] All unit tests passing
- [x] E2E tests passing
- [x] Exported specs validate in Swagger Editor

---

**Status**: ✅ COMPLETE
**Completed**: 2025-12-14
