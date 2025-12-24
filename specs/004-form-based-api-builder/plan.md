# Implementation Plan: Form-Based OpenAPI Builder

**Feature**: 004-form-based-api-builder
**Spec Reference**: [spec.md](spec.md)
**Date**: 2025-12-18
**Approach**: TDD (Test-Driven Development) + Incremental UI layers

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                                │
├──────────────────────────────────────────────────────────────────────────┤
│  FormBuilder        │  CSVEditor      │  PreviewPanel    │  OASViewer   │
│  (Multi-tab)        │  (Grid/table)   │  (Live preview)  │  (JSON view) │
│     │                    │                 │                   │        │
│     └────────────────────┼─────────────────┴───────────────────┘        │
│                          │                                              │
│                      useFormState                                       │
│                     (useReducer)                                        │
│                          │                                              │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
                   POST /oas/transform
                   POST /oas/validate
                   POST /csv/import
                   POST /csv/export
                   POST /docs/generate
                           │
┌──────────────────────────┼──────────────────────────────────────────────┐
│                   Backend (FastAPI)                                     │
├──────────────────────────┼──────────────────────────────────────────────┤
│  OAS Transform           │ CSV Handler         │ Doc Generator          │
│  Service                 │ Service             │ Service                │
│  - merge()               │ - parse_csv()       │ - generate_html()      │
│  - track_edits()         │ - export_csv()      │ - render_pdf()         │
│  - resolve_path()        │ - validate_rows()   │ - include_examples()   │
│                          │                     │                        │
│  ┌─────────────────────┐ │                     │                        │
│  │ OAS Canonical       │ │                     │                        │
│  │ (YAML/JSON)         │ │                     │                        │
│  │ in Database         │ │                     │                        │
│  └─────────────────────┘ │                     │                        │
│                          │                     │                        │
└──────────────────────────┴─────────────────────┴────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Foundation (Infrastructure Setup)

**Dependency**: Feature 003 export service

1. **Create OAS Transform Service**
   - Parse OAS (reuse Feature 003 parser)
   - Track edit paths (JsonPointer-based)
   - Merge algorithm: `merge(original_oas, user_edits) → merged_oas`
   - Test: original + empty edits = original (lossless)

2. **Create Edit-Path Identity System**
   - Define PathSegment types (key, index, ref, name)
   - Implement ref-based identity for $ref items
   - Implement fingerprint for inline items
   - Handle array order preservation

3. **Setup Database Schema**
   - Store OAS specs (version history)
   - Store edit transactions (for undo/redo)
   - Index for fast lookups (operationId, path, etc.)

---

### Phase 1: Backend Services (TDD)

**Tests First, Implementation Second**

#### 1.1 OAS Transform Service Tests & Implementation

**Tests to Write First**:
```python
# tests/unit/test_oas_transform.py
- test_merge_empty_edits_returns_original
- test_merge_modifies_only_touched_fields
- test_merge_preserves_allof_structure
- test_merge_preserves_xstar_extensions
- test_merge_preserves_array_order
- test_extract_path_parameters_handles_refs
- test_extract_path_parameters_handles_inline_schemas
```

**Implementation**:
- `OASTransformer` class with `merge()`, `extract_edits()`, `resolve_path()`
- JsonPointer library for path resolution
- Deep merge with change tracking

#### 1.2 CSV Handler Tests & Implementation

**Tests to Write First**:
```python
# tests/unit/test_csv_handler.py
- test_parse_basic_csv_operations
- test_parse_advanced_csv_with_parameters
- test_parse_expert_csv_with_schemas
- test_export_csv_basic_profile_round_trip
- test_export_csv_advanced_profile_round_trip
- test_csv_import_validation_errors
- test_csv_import_handles_duplicates
```

**Implementation**:
- `CSVParser` class for each profile (Basic, Advanced, Expert)
- `CSVExporter` class for reverse mapping
- Row validation with detailed error messages

#### 1.3 Document Generator Tests & Implementation

**Tests to Write First**:
```python
# tests/unit/test_doc_generator.py
- test_generate_html_from_oas
- test_include_operation_descriptions
- test_include_model_schemas
- test_include_security_info
- test_generate_pdf_headless_chrome
- test_pdf_includes_toc
- test_html_includes_code_examples
```

**Implementation**:
- Markdown template builder from OAS
- Markdown → HTML (markdown library)
- HTML → PDF (weasyprint or headless Chrome)

#### 1.4 API Endpoints (Contract Tests)

**Tests to Write First**:
```python
# tests/contract/test_form_api.py
- test_post_oas_transform_returns_valid_oas
- test_post_oas_validate_accepts_valid_specs
- test_post_oas_validate_rejects_invalid_specs
- test_post_csv_import_merges_operations
- test_post_csv_export_returns_valid_csv
- test_post_docs_generate_returns_html
- test_post_docs_generate_pdf_returns_pdf
```

**Implementation**:
- `/api/v1/oas/transform` - POST with original + edits, returns merged OAS
- `/api/v1/oas/validate` - POST OAS, returns validation result
- `/api/v1/csv/import` - POST CSV, returns preview of changes
- `/api/v1/csv/export` - GET with spec_id + profile, returns CSV
- `/api/v1/docs/generate` - POST OAS + format, returns HTML or PDF

---

### Phase 2: Frontend Form UI (Component-Driven)

**Components to Build**:

#### 2.1 Form Infrastructure

- `FormStateProvider` - Global form state (useReducer)
  - Form data: current OAS state
  - Edit tracking: which fields changed
  - Undo/redo stack

- `FormField` - Reusable field component
  - Input types: text, dropdown, textarea, number, checkbox
  - Validation display (error/warning)
  - Help tooltip

#### 2.2 Core Form Tabs

**Tab 1: API Info**
- Title, version, description
- Servers (URL, description, variables)
- Contact info, license
- External docs link

**Tab 2: Models**
- Model list (sidebar)
- Model editor (name, description, fields)
- Field editor (name, type, required, description, constraints)
- Add/delete model

**Tab 3: Operations**
- Operation list (sidebar, grouped by tag/path)
- Operation editor (path, method, summary, description)
- Parameter editor (name, in [query/path/header], type, required)
- Request/response body editor
- Example editor

**Tab 4: Security**
- Security scheme list
- Security scheme editor (type, flows, scopes)
- Global security requirement selector

**Tab 5: Export/Download**
- Format selector (YAML/JSON)
- Profile selector for CSV export
- Download buttons
- Validation status

#### 2.3 Profile-Based Visibility

Implement `<ProfileGate>` component:
```tsx
<ProfileGate profile="Advanced+">
  <ComplexFieldComponent />
</ProfileGate>
```

Profiles: Basic < Advanced < Technical < Expert

#### 2.4 Real-Time Validation Panel

- Show error/warning count
- Actionable error messages
- Link to OAS docs for complex issues

#### 2.5 OAS Viewer (Expert Mode)

- Read-only JSON viewer with syntax highlighting
- Show which fields were edited (highlight changed lines)
- Show file size

---

### Phase 3: Import & Surgical Editing Flow

#### 3.1 OAS Import UI

- File upload button
- Progress indicator
- Import summary: "Imported 45 operations, 32 models, 0 errors"
- Error display if import fails

#### 3.2 Surgical Editing

- Track which fields user edited (form onChange)
- On export: send original + edits to backend
- Backend merges, returns result
- Show summary: "Modified 3 fields"

#### 3.3 CSV Import/Export

- CSV Tabs in Form UI
- Import: file upload → preview → confirm
- Export: choose profile → download

---

### Phase 4: Integration & Polish

#### 4.1 Form State Persistence

- Auto-save to localStorage (debounced 10s)
- Restore on page refresh
- Show "saving..." indicator

#### 4.2 Undo/Redo

- Implement undo/redo stack (20 levels)
- Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
- Disable when stack empty

#### 4.3 PDF Generation

- Use existing backend service
- Add "Generate PDF" button in Export tab
- Show preview before download

#### 4.4 Responsive Design

- Desktop: 2-column (form + preview)
- Tablet: Stack vertically
- Mobile: Form only (export to desktop)

---

## Key Design Decisions

### Decision 1: OAS as Canonical

**Chosen**: OpenAPI Specification is the source of truth
**Why**: Industry standard, lossless, tooling support
**Impact**: Backend must validate all exports against OAS schema

### Decision 2: Edit-Path Identity Strategy

**Chosen**: Hybrid approach
- Ref-based for `$ref` items
- Index + fingerprint for inline items
- Preserve original array order
**Why**: Balances stability vs simplicity
**Impact**: Add `OASPath` class with these rules

### Decision 3: Progressive Disclosure (Profiles)

**Chosen**: 4 profiles (Basic, Advanced, Technical, Expert)
**Why**: Prevents cognitive overload for casual users
**Impact**: Frontend needs conditional rendering for each profile

### Decision 4: CSV for Integration, Not Primary Authoring

**Chosen**: Form UI is primary; CSV is secondary
**Why**: Forms are more user-friendly than spreadsheets for nested data
**Impact**: CSV has limitations (e.g., allOf hard to represent); mitigate with Expert profile

### Decision 5: Lossless OAS Import

**Chosen**: Any valid OAS can be imported without data loss
**Why**: Users shouldn't lose data when migrating specs
**Impact**: Must preserve allOf, oneOf, vendor extensions, array order exactly

---

## Technology Stack

### Backend
- **FastAPI**: HTTP API server
- **pydantic**: OAS schema validation
- **jsonpointer**: Path resolution for edit tracking
- **python-json-logger**: Structured logging
- **weasyprint** or **headless Chrome**: PDF generation
- **markdown**: Convert to HTML

### Frontend
- **React 19**: UI framework
- **useReducer**: Form state management
- **react-jsonschema-form**: Auto-generate form from JSON schema (for Advanced+)
- **monaco-editor**: JSON viewer for Expert mode
- **tailwindcss**: Styling
- **zod**: Client-side validation

### Database
- **PostgreSQL**: OAS spec storage, version history
- **Alembic**: Migrations

---

## Dependencies & Critical Path

```
Foundation (Phase 0)
    ↓
OAS Transform Service (Phase 1.1) ← CRITICAL PATH
    ↓
CSV Handler (Phase 1.2)
    ↓
Doc Generator (Phase 1.3)
    ↓
API Endpoints (Phase 1.4)
    ↓
Frontend Form UI (Phase 2) ← CAN START PARALLEL with Phase 1
    ↓
Import/Surgical Editing (Phase 3)
    ↓
Integration & Polish (Phase 4)
```

**Parallel Work Possible**:
- Phase 1.1 and Phase 2 can be developed in parallel (mock API)
- Phase 1.2, 1.3, 1.4 independent after 1.1 complete

---

## Testing Strategy

### Unit Tests (Backend)
- OAS transform logic (lossless, edit tracking)
- CSV parse/export round-trip
- Document generation (HTML/PDF)
- Path identity resolution

### Component Tests (Frontend)
- Form field rendering and validation
- Profile-based visibility
- State management (reducers)
- Undo/redo logic

### Contract Tests (API)
- POST /oas/transform returns valid OAS
- POST /csv/import merges correctly
- POST /docs/generate returns valid HTML/PDF
- Error cases handled gracefully

### E2E Tests (Full Workflow)
- Create new API spec via form
- Export to OAS, validate in Swagger Editor
- Import complex OAS, edit, export
- CSV import/export round-trip
- Generate PDF, verify content

### Manual Testing
- Non-technical user creates spec in <20 min
- Stakeholder reviews generated PDF
- Developer imports legacy spec, adds operation

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Form render (500 ops) | <2s | Time to interactive |
| CSV import | <5s | File upload + parse + preview |
| CSV export | <5s | File generate + download |
| OAS export + validate | <3s | Parse + validate + response |
| PDF generation | <10s | Async operation |
| Search/filter operations | <500ms | User types in search box |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| CSV representation too limited | Provide Expert profile with full OAS access |
| Edit-path identity breaks | Hybrid approach + fingerprints + user warnings |
| Form too complex for casual users | Progressive disclosure + extensive help tooltips |
| Large specs slow down browser | Lazy load operations, virtualize lists |
| PDF generation fails | Fallback to browser PDF print |

---

## Success Metrics

✅ All acceptance scenarios pass
✅ Non-technical user completes spec in <20 minutes
✅ OAS export validates in Swagger Editor
✅ CSV round-trip is lossless (100% reversible)
✅ Performance targets met (form <2s, export <5s)
✅ Stakeholders rate PDF documentation as professional
✅ All unit/contract/E2E tests passing
✅ >80% code coverage

---

## Next Steps

1. **Task Breakdown**: Generate 40-50 granular, dependency-ordered tasks
2. **Branch Creation**: Create `004-form-based-api-builder` branch
3. **Phase 0 Implementation**: Setup OAS Transform Service
4. **Parallel Development**: Start Backend Phase 1 + Frontend Phase 2
5. **Integration**: Wire up frontend/backend in Phase 3

