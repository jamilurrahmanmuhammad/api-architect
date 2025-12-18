# Task Breakdown: Form-Based OpenAPI Builder

**Feature**: 004-form-based-api-builder
**Branch**: `004-form-based-api-builder`
**Date**: 2025-12-18
**Plan Reference**: [plan.md](plan.md)
**Spec Reference**: [spec.md](spec.md)

**Approach**: Test-Driven Development (TDD) - Tests defined first, implementation follows
**Execution Strategy**: Foundation → Backend Services → Frontend UI → Integration

---

## Executive Summary

- **Total Tasks**: 52
- **Phase 0 (Foundation)**: 4 tasks
- **Phase 1 (Backend Services)**: 20 tasks
- **Phase 2 (Frontend UI)**: 18 tasks
- **Phase 3 (Import/Editing)**: 6 tasks
- **Phase 4 (Integration)**: 4 tasks

---

## Phase 0: Foundation & Infrastructure (4 tasks)

*Setup database, OAS paths library, and edit-path identity system*

### T001: Create OAS Edit-Path Identity System
- [ ] Write unit tests for PathSegment types (key, index, ref, name)
  - Test: `PathSegment.key("schemas")` creates key segment
  - Test: `PathSegment.ref("#/components/schemas/Pet")` creates ref segment
  - Test: `PathSegment.index(0, fingerprint="a3f2b1")` creates index segment
- [ ] Implement OASPath class with segment resolution
  - Parse JSONPointer paths
  - Resolve paths in OAS structure
  - Handle ref-based identity
- [ ] Write tests for path equality and stability
  - Test: Same path with same fingerprint equals
  - Test: Different array order changes index identity

### T002: Create OAS Canonical Storage Schema
- [ ] Write database schema migration for specs table
  - Columns: id, spec_id, oas_content (YAML), version, created_at, updated_at
  - Index on spec_id for fast lookups
- [ ] Write tests for spec storage/retrieval
  - Test: Store OAS, retrieve, verify identical
  - Test: Version history preserved

### T003: Setup Edit Transaction Tracker
- [ ] Create edit transaction log table
  - Columns: id, spec_id, path, old_value, new_value, timestamp
- [ ] Write tests for transaction recording
  - Test: Record field change
  - Test: Retrieve transaction history
  - Test: Compute diff from transactions

### T004: Create OAS Validator Helper
- [ ] Write tests for OAS validation
  - Test: Valid OAS 3.0.3 passes
  - Test: Valid OAS 3.1.0 passes
  - Test: Invalid spec rejected with error message
  - Test: Detailed error messages for common issues
- [ ] Implement OAS validator using openapi-spec-validator library
  - Wrap library with friendly error messages

---

## Phase 1: Backend Services (20 tasks)

### Section 1.1: OAS Transform Service (8 tasks)

#### T005: OAS Merge Algorithm (Lossless)
- [ ] Write unit tests for merge function
  - Test: `merge(original, {})` returns original unchanged
  - Test: `merge(original, {info.title="New"})` modifies only title
  - Test: `merge(original, edits)` preserves allOf structures
  - Test: Merge preserves x-* vendor extensions
  - Test: Merge preserves array order from original
  - Test: Merge handles deep nested edits
- [ ] Implement OASTransformer.merge(original, edits) → merged_oas
  - Use deepmerge with custom rules
  - Preserve structure identity

#### T006: Edit Path Extraction
- [ ] Write tests for extracting edited paths
  - Test: Identify which fields were touched
  - Test: Return list of OASPath objects for edits
  - Test: Handle nested object edits
  - Test: Handle array index edits
- [ ] Implement OASTransformer.extract_edits(original, modified) → [OASPath]

#### T007: Path Resolution with Fingerprinting
- [ ] Write tests for resolving edit paths in complex structures
  - Test: Resolve `components.schemas.Pet.allOf[1].properties.name` with fingerprint
  - Test: Warn if fingerprint changed (array item changed)
  - Test: Resolve $ref-based paths without fingerprint
  - Test: Handle missing paths gracefully
- [ ] Implement resolve_path() with fingerprint verification

#### T008: Edit Conflict Detection
- [ ] Write tests for detecting conflicts
  - Test: Original unchanged = no conflict
  - Test: User edit + someone else's edit = conflict detected
  - Test: Return conflict resolution options
- [ ] Implement conflict detection in merge

#### T009: API Endpoint: POST /oas/transform
- [ ] Write contract tests
  - Test: POST with original OAS + edits returns merged OAS
  - Test: Returned OAS is valid
  - Test: Invalid input returns 422 with details
- [ ] Implement FastAPI endpoint
  - Validation with Pydantic
  - Error handling

#### T010: API Endpoint: POST /oas/validate
- [ ] Write contract tests
  - Test: Valid OAS returns {valid: true, message: "Valid OAS 3.0.3"}
  - Test: Invalid OAS returns {valid: false, errors: [...]}
  - Test: Error messages are actionable
- [ ] Implement validation endpoint

#### T011: Storage Service: Save/Load OAS
- [ ] Write tests for persistence
  - Test: Save OAS, retrieve by ID
  - Test: Version history maintained
  - Test: Transactions logged
- [ ] Implement OASRepository class

#### T012: Undo/Redo Service
- [ ] Write tests for undo/redo
  - Test: Record transaction
  - Test: Undo previous transaction
  - Test: Redo after undo
  - Test: Max 20-level stack
- [ ] Implement UndoRedoService class

### Section 1.2: CSV Handler (6 tasks)

#### T013: CSV Basic Profile Parser
- [ ] Write tests for parsing Basic CSV
  - Test: CSV headers recognized
  - Test: Parse operations: operation_id, path, method, summary
  - Test: Invalid rows show clear errors
  - Test: Empty fields handled
- [ ] Implement CSVParser.parse_basic(csv_content) → [Operation]

#### T014: CSV Advanced Profile Parser
- [ ] Write tests for parsing Advanced CSV
  - Test: All Basic fields +parameters, request/response
  - Test: Multi-row parameters (one parameter per row)
  - Test: Examples in separate column
- [ ] Implement CSVParser.parse_advanced(csv_content) → [OperationWithDetails]

#### T015: CSV Expert Profile Parser
- [ ] Write tests for Expert CSV
  - Test: All Advanced fields +security, webhooks, x-* extensions
  - Test: Complex schema references
- [ ] Implement CSVParser.parse_expert(csv_content)

#### T016: CSV Export (All Profiles)
- [ ] Write tests for CSV export
  - Test: Export OAS to Basic CSV format
  - Test: Export to Advanced CSV format
  - Test: Export to Expert CSV format
  - Test: All OAS data preserved in round-trip
- [ ] Implement CSVExporter class with profile-specific output

#### T017: CSV Import Service Integration
- [ ] Write tests for CSV import workflow
  - Test: Import Basic CSV → operations added to OAS
  - Test: Merge with existing operations (updates)
  - Test: Import preview shows changes
  - Test: Validation errors prevent import
- [ ] Implement CSVImportService.import_and_merge(csv, original_oas)

#### T018: API Endpoint: POST /csv/import and GET /csv/export
- [ ] Write contract tests
  - Test: POST /csv/import with CSV file
  - Test: GET /csv/export returns CSV with correct headers
  - Test: Both endpoints validate input
- [ ] Implement FastAPI endpoints

### Section 1.3: Document Generator (4 tasks)

#### T019: Markdown Template Generator
- [ ] Write tests for generating Markdown from OAS
  - Test: API title and version in header
  - Test: Operations rendered as ## sections
  - Test: Parameters as tables
  - Test: Models/schemas as code blocks
  - Test: Security info included
- [ ] Implement MarkdownGenerator class
  - Template engine (Jinja2)
  - OAS → Markdown

#### T020: HTML Rendering
- [ ] Write tests for HTML generation
  - Test: Markdown to HTML conversion
  - Test: Syntax highlighting for code examples
  - Test: Table of contents generated
  - Test: Responsive styling applied
- [ ] Implement HTMLGenerator class
  - Use `markdown` library
  - Add CSS for professional styling

#### T021: PDF Generation
- [ ] Write tests for PDF generation
  - Test: HTML → PDF conversion works
  - Test: PDF includes all content
  - Test: PDF is searchable
  - Test: Generation completes in <10s for large specs
- [ ] Implement PDFGenerator class
  - Use weasyprint (pure Python)
  - Fallback to headless Chrome if needed

#### T022: API Endpoint: POST /docs/generate
- [ ] Write contract tests
  - Test: POST with OAS + format (html/pdf) returns document
  - Test: PDF Content-Type is application/pdf
  - Test: HTML Content-Type is text/html
  - Test: Error handling for invalid format
- [ ] Implement FastAPI endpoint

---

## Phase 2: Frontend Form UI (18 tasks)

### Section 2.1: Form Infrastructure (4 tasks)

#### T023: FormStateProvider with useReducer
- [ ] Write component tests for form state
  - Test: Initial state loads empty OAS
  - Test: Update field dispatches action
  - Test: Edit tracking records changes
  - Test: Undo/redo works
- [ ] Implement FormStateProvider
  - useReducer with action types: UPDATE_FIELD, UNDO, REDO, LOAD_OAS
  - Track touched fields
  - Maintain undo/redo stack

#### T024: FormField Component (Reusable)
- [ ] Write component tests
  - Test: Text input renders
  - Test: Textarea for long descriptions
  - Test: Dropdown select
  - Test: Validation error display
  - Test: Help tooltip shows on hover
- [ ] Implement FormField component
  - Support multiple input types
  - Validation display
  - Accessibility (labels, ARIA)

#### T025: ProfileGate Component (Conditional Rendering)
- [ ] Write tests for profile-based visibility
  - Test: Basic profile shows only basic fields
  - Test: Advanced profile shows +advanced fields
  - Test: Technical profile shows +composition
  - Test: Expert shows everything
- [ ] Implement ProfileGate wrapper component

#### T026: Form State Persistence (localStorage)
- [ ] Write tests for auto-save
  - Test: Form state saved to localStorage every 10s (debounced)
  - Test: State restored on page reload
  - Test: "Saving..." indicator shown during save
  - Test: Errors handled gracefully
- [ ] Implement auto-save hook
  - useEffect to watch form state
  - Debounce saves
  - Error handling

### Section 2.2: Form Tabs (8 tasks)

#### T027: API Info Tab
- [ ] Write component tests
  - Test: Title, version, description fields render
  - Test: Servers section (can add/remove)
  - Test: Contact and license fields (optional)
- [ ] Implement ApiInfoTab component

#### T028: Models Tab (Schema Editor)
- [ ] Write component tests
  - Test: List of models displayed
  - Test: Add model button works
  - Test: Model name, description editable
  - Test: Delete model confirmation dialog
- [ ] Implement ModelsTab component
  - Model list with search/filter
  - Add/edit/delete actions

#### T029: Model Fields Editor
- [ ] Write component tests
  - Test: Field table displays (name, type, required, description)
  - Test: Field type dropdown (string, integer, number, boolean, object, array, date, datetime, $ref)
  - Test: Required checkbox
  - Test: Add/remove field rows
  - Test: Validation constraints visible in Advanced+
- [ ] Implement FieldEditor component
  - Dynamic row addition/removal
  - Type-specific constraints (min/max length, pattern, etc.)

#### T030: Operations Tab (Endpoints Editor)
- [ ] Write component tests
  - Test: Operation list (path/method)
  - Test: Search/filter operations
  - Test: Add operation button
  - Test: Edit operation details (path, method, summary, description)
- [ ] Implement OperationsTab component
  - Grouped by tag or path
  - Quick search

#### T031: Parameters Editor (Inline)
- [ ] Write component tests
  - Test: Parameter table (name, in [query/path/header/cookie], type, required, description)
  - Test: Add/remove parameter rows
  - Test: In-field validation (e.g., path params required)
- [ ] Implement ParametersEditor component
  - Constraint validation
  - Example suggestion

#### T032: Request/Response Body Editor
- [ ] Write component tests
  - Test: Select request body schema (model reference)
  - Test: Select response schema (single or array)
  - Test: Multiple response codes (200, 400, 404, etc.)
- [ ] Implement RequestResponseEditor component

#### T033: Security Tab
- [ ] Write component tests
  - Test: Security scheme list
  - Test: Add scheme (API Key, OAuth2, OpenID Connect)
  - Test: Edit scheme details
  - Test: Global security requirement selector
- [ ] Implement SecurityTab component

#### T034: Export Tab
- [ ] Write component tests
  - Test: Format selector (YAML/JSON)
  - Test: Profile selector for CSV (Basic/Advanced/Expert)
  - Test: Download button enabled when form valid
  - Test: Validation status shown
- [ ] Implement ExportTab component

### Section 2.3: UI Polish (6 tasks)

#### T035: Validation Panel (Real-Time Errors/Warnings)
- [ ] Write component tests
  - Test: Error count displayed
  - Test: Warning count displayed
  - Test: List of actionable errors
  - Test: Link to OAS docs for complex issues
- [ ] Implement ValidationPanel component
  - Real-time validation feedback

#### T036: OAS Viewer (Expert Mode)
- [ ] Write component tests
  - Test: JSON viewer renders with syntax highlighting
  - Test: Edited fields highlighted
  - Test: Show file size
- [ ] Implement OASViewer component
  - Use react-json-view or similar
  - Syntax highlighting

#### T037: Profile Selector (Dropdown in Header)
- [ ] Write component tests
  - Test: 4 profiles available
  - Test: Selecting profile changes form visibility
  - Test: Selection persisted
- [ ] Implement ProfileSelector component

#### T038: Undo/Redo Buttons
- [ ] Write component tests
  - Test: Undo button disabled when no history
  - Test: Undo works (form reverts)
  - Test: Redo button works
  - Test: Keyboard shortcuts work (Ctrl+Z, Ctrl+Y)
- [ ] Implement UndoRedo buttons
  - Wire to FormStateProvider
  - Keyboard handlers

#### T039: Auto-Save Indicator
- [ ] Write component tests
  - Test: "Saving..." shown during save
  - Test: "Saved" shown after success
  - Test: Error shown if save fails
- [ ] Implement SaveIndicator component

#### T040: Help Tooltips on Every Field
- [ ] Write tests for tooltip display
  - Test: Tooltip appears on hover (or help icon click)
  - Test: Tooltip explains field purpose
  - Test: Link to OAS docs where relevant
- [ ] Add tooltip text to all FormField components

---

## Phase 3: Import & Surgical Editing (6 tasks)

#### T041: OAS Import UI Component
- [ ] Write component tests
  - Test: File upload button
  - Test: Drag-drop file support
  - Test: Progress indicator shown
  - Test: Import summary displayed ("Imported 45 ops, 32 models")
  - Test: Errors shown if import fails
- [ ] Implement OASImportDialog component

#### T042: CSV Import UI Component
- [ ] Write component tests
  - Test: File upload for CSV
  - Test: Import preview shows changes
  - Test: Confirm/cancel buttons
  - Test: Errors for invalid CSV
- [ ] Implement CSVImportDialog component

#### T043: CSV Export Flow
- [ ] Write component tests
  - Test: Profile selector shown
  - Test: "Download CSV" button generates file
  - Test: File named correctly (api-{timestamp}.csv)
- [ ] Implement CSVExportFlow
  - Call backend endpoint
  - Trigger download

#### T044: PDF Export & Preview
- [ ] Write component tests
  - Test: "Generate PDF" button
  - Test: Loading spinner while generating
  - Test: PDF preview dialog (iframe with PDF)
  - Test: Download button in preview
- [ ] Implement PDFExportFlow
  - Async PDF generation
  - Preview + download

#### T045: Merge Conflict UI (if needed)
- [ ] Write component tests
  - Test: Conflict detected shown in modal
  - Test: User options (keep mine, keep theirs, merge)
  - Test: Resolution applied to form
- [ ] Implement MergeConflictDialog
  - Show conflicting fields
  - Allow resolution

#### T046: Import Summary & Undo
- [ ] Write component tests
  - Test: After import, show "Imported X items"
  - Test: "Undo import" button to revert
  - Test: Form state reverted correctly
- [ ] Implement import undo
  - Track as single transaction in undo stack

---

## Phase 4: Integration & Polish (4 tasks)

#### T047: End-to-End Test: Create New API Spec
- [ ] Write E2E test
  - User fills form fields (title, version, operations, models)
  - Exports to OAS
  - Validates in Swagger Editor
  - Checks against [spec.md acceptance test #1]
- [ ] Test automation script

#### T048: End-to-End Test: Import Complex OAS & Edit
- [ ] Write E2E test
  - Import complex OAS with allOf/oneOf/x-*
  - Edit one field
  - Export and verify merge
  - Check that untouched structures preserved
  - Validates against [spec.md acceptance test #2]

#### T049: End-to-End Test: CSV Round-Trip
- [ ] Write E2E test
  - Create API spec
  - Export to CSV (each profile: Basic, Advanced, Expert)
  - Re-import CSV
  - Verify 100% reversible
  - Checks against [spec.md acceptance test #3]

#### T050: Performance Testing & Optimization
- [ ] Benchmarks for targets
  - Form render: <2s for 500 operations
  - CSV export: <5s
  - OAS validate: <3s
  - PDF generation: <10s
- [ ] Optimize if targets not met
  - Lazy load operations
  - Virtualize long lists
  - Async PDF generation

#### T051: Documentation & Deployment
- [ ] Create user documentation (help pages)
- [ ] Create developer documentation (API docs)
- [ ] Setup CI/CD for Feature 004 branch
- [ ] Prepare for merge to master

#### T052: Code Review & Cleanup
- [ ] Review all code for quality
- [ ] Remove debug logging
- [ ] Ensure test coverage >80%
- [ ] Final PR readiness check

---

## Dependencies & Execution Order

### Critical Path (Must complete in order)

```
T001 (Path Identity)
  ↓
T002 (Storage Schema)
  ↓
T005 (OAS Merge) ← CRITICAL
  ↓
T009 (Transform Endpoint)
  ↓
T023 (FormStateProvider) ← Can start parallel
  ↓
T027-034 (Form Tabs)
  ↓
T041-046 (Import/Surgical Editing)
  ↓
T047-049 (E2E Tests)
```

### Parallelizable Tasks

- T003, T004 (after T002 completes)
- T006, T007, T008 (with T005)
- T010-T022 (after T005 complete)
- T024-T034 (frontend, can work in parallel)
- T050-T052 (near end, quality checks)

---

## Testing Summary

### Unit Tests
- OAS transformation (merge, path resolution, fingerprinting)
- CSV parsing (all profiles)
- Document generation (Markdown, HTML, PDF)
- Form state management and reducers

### Component Tests
- Form fields, tabs, dialogs
- Profile gating
- Validation panel
- Undo/redo

### Contract Tests
- All API endpoints return correct formats
- Error cases handled gracefully

### E2E Tests
- Full workflows: create → export → validate
- Import → edit → export
- CSV round-trip (all profiles)

### Performance Tests
- Form render time
- CSV operations
- OAS validation
- PDF generation

---

## Success Criteria

- ✅ All 52 tasks completed
- ✅ 80%+ code coverage
- ✅ All acceptance scenarios pass
- ✅ Performance targets met
- ✅ OAS exports validate in Swagger Editor
- ✅ CSV round-trip is 100% reversible
- ✅ Non-technical users rate form as "easy to use"
- ✅ Ready for PR merge and deployment

