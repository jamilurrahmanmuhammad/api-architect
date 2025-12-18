# Feature Specification: Form-Based OpenAPI Builder

**Feature Branch**: `004-form-based-api-builder`
**Created**: 2025-12-18
**Status**: Specification
**Input**: Research paper + CSV schemas (existing) → Specification for form-based UI and OAS transformation

---

## Executive Summary

Feature 004 enables non-technical users to create, edit, and export valid OpenAPI Specification (OAS) documents through an intuitive form-based UI, with CSV serving as an interchange format for bulk operations. The system preserves 100% fidelity through lossless OAS import/export and supports surgical editing where only touched fields are modified while preserving untouched structures.

**Core Innovation**: Unlike existing tools, this system maintains OAS as the canonical format, allowing complex specs (allOf, oneOf, vendor extensions) to be imported without data loss and edited surgically through the UI.

---

## Problem Statement

### Current Challenges

1. **Technical Barrier**: OpenAPI YAML/JSON syntax is complex for non-technical stakeholders
2. **Error-Prone**: Manual YAML editing leads to syntax errors and invalid specs
3. **Accessibility**: Business analysts, product managers, technical writers cannot participate in API documentation
4. **No Bulk Operations**: CSV import/export missing from existing tools
5. **Cognitive Overload**: Full OAS complexity (allOf, oneOf, security, webhooks) overwhelms casual users
6. **Migration Lock-in**: Existing complex OAS specs cannot be imported/edited without data loss

### Target Users

| Persona | Technical Level | Primary Interface | Use Case |
|---------|-----------------|-------------------|----------|
| Business Analyst | Low | Form UI (Basic Profile) | Document API business requirements |
| Product Manager | Low | Form UI (Basic Profile) | Define API contracts with stakeholders |
| Technical Writer | Medium | Form UI (Advanced Profile) | Create comprehensive API documentation |
| API Developer | High | Form UI (All) + CSV | Migrate and bulk-edit existing specs |
| API Architect | Expert | CSV + Direct OAS | Full control, complex compositions |

---

## Core Principles & Architecture

### Principle 1: OpenAPI as Canonical

**Decision**: OpenAPI Specification is the single source of truth. All other representations (Form UI, CSV) derive from and synchronize with OAS.

**Why**:
- OAS is industry standard (maintained by OpenAPI Initiative)
- Validation tools exist (Spectral, AJV, Swagger Editor)
- Ecosystem compatibility (Postman, Swagger UI, code generators)
- Lossless data fidelity guaranteed
- No need to maintain custom schema

### Principle 2: Form UI as Primary Authoring Experience

**Decision**: Web-based form interface is the primary user-facing surface. Users never see raw YAML/JSON unless they choose to.

**Progressive Disclosure**:
- **Basic Profile**: Paths, summaries, descriptions, examples
- **Advanced Profile**: Full schemas, parameters, validation rules
- **Technical Profile**: Composition (allOf/oneOf/anyOf), conditional schemas
- **Expert Profile**: Everything + direct OAS JSON view

### Principle 3: Lossless OAS Import with Surgical Editing

**Decision**: Any valid OAS file (simple or complex) can be imported with zero data loss. Edits through UI modify only touched fields; untouched structures are preserved exactly.

**Guarantees**:
- `allOf`, `oneOf`, `anyOf` preserved as-is
- Vendor extensions (x-*) never lost
- Array order preserved from original
- References ($ref) stable across edit cycles
- Comments preserved if stored as x-comments

### Principle 4: CSV for Integration, Not Authoring

**Decision**: CSV is a secondary interchange format for bulk operations, not the primary authoring surface.

**Use Cases**:
- Bulk import from spreadsheets (parameters from Excel)
- Export to spreadsheet for review by non-technical teams
- System-to-system integration (API Gateway configs)
- Batch migration from legacy API documentation

**Tiered CSV Profiles**:
- **Basic**: Operations, parameters, responses only
- **Advanced**: Includes headers, examples, validation rules
- **Expert**: Full OAS expressiveness including security, webhooks

---

## Feature Requirements

### Functional Requirements

#### FR-001: Form-Based API Creation
- User can create new API spec through guided form interface
- Form captures: API title, version, description, servers, security schemes
- Form supports adding/editing/deleting operations, models, parameters
- Real-time validation with human-readable error messages
- Form state auto-saves to browser local storage (debounced every 10s)

#### FR-002: OAS Import (Lossless)
- User can upload existing OAS 3.0.x or 3.1.x files (YAML or JSON)
- All OAS structures preserved exactly:
  - Complex schemas (allOf, oneOf, anyOf, not)
  - Conditional schemas (if/then/else)
  - Vendor extensions (x-* properties)
  - Array order preserved
  - $ref and $id references intact
- UI displays import summary: entities detected, errors if any
- Invalid OAS shows clear error message with line numbers

#### FR-003: Surgical Editing with Change Tracking
- User edits only desired fields through form
- Edit-path identity system tracks which fields were touched
- On export: merge original OAS + user edits
- Untouched fields exported exactly as in original
- Conflict resolution UI if original structure ambiguous

#### FR-004: Multi-Profile Form UI
- User selects profile: Basic, Advanced, Technical, or Expert
- Form shows/hides fields based on profile
- Basic: operation path, method, summary, responses
- Advanced: +parameters, request/response schemas, examples
- Technical: +composition (allOf/oneOf), conditional schemas, security
- Expert: +webhooks, callbacks, server variables, everything
- Profile switching preserves already-entered data

#### FR-005: CSV Import/Export
- User can export API spec to CSV in selected profile (Basic/Advanced/Expert)
- User can import CSV with new or updated operations/models/parameters
- CSV header row clearly labeled
- Import validates row format, provides clear error messages for invalid rows
- Export includes descriptive comments explaining each field

#### FR-006: Document Generation
- User can generate professional documentation: PDF or HTML
- Documentation includes:
  - API overview and authentication info
  - Operation descriptions with parameters and response examples
  - Data model documentation
  - Code examples (optional: cURL, JavaScript, Python)
- Generated document is standalone (no external dependencies)
- PDF includes table of contents and is searchable

#### FR-007: OAS Export & Validation
- User can download spec as YAML or JSON
- Exported OAS validates against OpenAPI 3.0.3 or 3.1.0 schema
- Validation result shown: "Valid OpenAPI 3.0.3 ✓" or error list
- Export includes version number and generated timestamp

#### FR-008: Real-Time Validation & Guidance
- Form validates as user types:
  - Required fields highlighted if empty
  - Format validation (URI, email, etc.)
  - Semantic validation (duplicate operation paths, orphaned models)
- Validation panel shows:
  - Count of errors and warnings
  - Actionable guidance (not just "invalid")
  - Link to OpenAPI docs for complex issues

#### FR-009: Examples & Sample Data
- User can add examples for parameters and responses
- Examples shown in documentation and OAS spec
- Form suggests realistic examples based on field type
- Examples optional but recommended (validation warns if missing)

#### FR-010: Security & CORS Configuration
- Form section for security schemes: API Key, OAuth 2.0, OpenID Connect
- Form section for CORS headers and rate limiting
- Experts can add custom security extensions
- All security configs export to standard OAS security section

### Non-Functional Requirements

#### Performance
- Form renders within 2 seconds (even for 500+ operations)
- CSV import/export completes within 5 seconds for specs up to 1000 lines
- OAS import (parse + validate) completes within 3 seconds
- Search/filter operations responsive (<500ms)

#### Compatibility
- Supports OAS 3.0.0 through 3.0.4
- Supports OAS 3.1.0 and 3.1.1
- Exported OAS validates in Swagger Editor, Redoc, Postman
- Generated PDFs open in all major PDF readers
- CSV exports compatible with Excel, Google Sheets, Python pandas

#### Usability
- Tooltip help on every form field
- Keyboard shortcuts for common operations (Ctrl+S to save, Ctrl+Z undo)
- Undo/redo stack (20 levels)
- Form state persists across page refresh (localStorage)
- Responsive design: works on desktop, tablet (form stacks on mobile)

#### Reliability
- All user edits saved to browser storage (auto-recover on next visit)
- OAS validation prevents exporting invalid specs
- Edit-path conflicts caught and surfaced to user
- CSV import errors detailed and recoverable

---

## User Scenarios & Acceptance Tests

### Scenario 1: Business Analyst Creates First API Spec

**User**: Business Analyst (no technical background)
**Goal**: Document a new Pet Store API for stakeholder review

**Steps**:
1. Open Form UI, select "Basic" profile
2. Fill form: API name "Pet Store API", version "1.0.0", base URL "/api/v1"
3. Click "+ Add Operation" for "List Pets"
   - Path: `/pets`
   - Method: `GET`
   - Summary: "Get all pets"
   - Response: "List of pets"
4. Add another operation "Get Pet by ID"
5. Export to PDF, email to stakeholders
6. Stakeholder reviews in PDF, sends feedback
7. User re-opens form, updates descriptions, re-exports

**Acceptance**:
- ✅ Form is intuitive, no documentation needed
- ✅ User completes spec in <15 minutes
- ✅ Generated PDF is professional and readable
- ✅ Stakeholders can understand the API from PDF alone

---

### Scenario 2: Developer Imports Existing Complex OAS & Adds Operation

**User**: API Developer
**Goal**: Migrate legacy Swagger 2.0 → OAS 3.1, add new operation

**Steps**:
1. Upload existing OAS 3.0 file (500+ lines, uses allOf, x-* extensions)
2. System imports without errors; shows "Imported 45 operations, 32 models"
3. Select "Expert" profile to see all complexity
4. Verify allOf structures are preserved (visible in OAS tab)
5. Add new operation "Create Pet" (POST /pets)
6. Export OAS, validate in Swagger Editor
7. Generated OAS includes original allOf structures + new operation

**Acceptance**:
- ✅ Complex allOf/oneOf/x-* preserved without loss
- ✅ New operation correctly merged with existing
- ✅ Exported OAS validates in Swagger Editor
- ✅ Array order from original unchanged

---

### Scenario 3: Power User Bulk-Imports Parameters from Spreadsheet

**User**: API Developer
**Goal**: Update 20 operations with new query parameters from Excel

**Steps**:
1. Export current API to CSV (Advanced profile)
2. Receives CSV with all operations and parameters
3. Opens in Excel, adds 3 new columns for new query params across all operations
4. Exports updated CSV
5. Imports CSV back into Form UI
6. System shows import preview: "20 operations, 3 new parameters to add"
7. User reviews, clicks "Import"
8. New parameters merged with existing
9. Exports OAS

**Acceptance**:
- ✅ CSV preserves all existing data, allows bulk additions
- ✅ Import preview prevents accidents
- ✅ Merge handles conflicts gracefully
- ✅ OAS export includes all original + new fields

---

### Scenario 4: Technical Writer Edits Descriptions & Examples

**User**: Technical Writer
**Goal**: Improve operation descriptions and add response examples

**Steps**:
1. Import OAS from developer (already has structure)
2. Select "Advanced" profile to access examples
3. Edit descriptions and add JSON examples for 10 key operations
4. Verify form shows all untouched fields in read-only (gray text)
5. Export OAS; system shows "5 fields edited" in summary
6. Verify exported OAS has new descriptions + examples
7. Generate PDF documentation; review looks professional

**Acceptance**:
- ✅ Edit-path tracking shows exactly what was changed
- ✅ Untouched original data preserved
- ✅ Generated PDF includes new descriptions
- ✅ OAS still validates after edits

---

## Data Model & Mappings

### OAS → Form Mapping

| OAS Property | Form Location | Profile Visibility | Editable |
|--------------|---------------|--------------------|----------|
| `info.title` | API Info → Title | All | Yes |
| `info.version` | API Info → Version | All | Yes |
| `info.description` | API Info → Description | All | Yes |
| `servers[].url` | Servers → Base URL | Advanced+ | Yes |
| `paths.{path}.{method}.summary` | Operation → Summary | All | Yes |
| `components.schemas.{name}` | Models tab | Advanced+ | Yes |
| `components.securitySchemes` | Security tab | Technical+ | Yes |
| `webhooks.*` | Webhooks tab | Expert | Yes |
| `x-*` (vendor ext) | Expert mode only | Expert | Yes |

### CSV → OAS Mapping

**Basic Profile** (Small subset for non-technical users):
```
operation_id, path, method, summary, response_status, response_content_type
```

**Advanced Profile** (Full coverage for developers):
```
operation_id, path, method, summary, description, parameter_name, parameter_in,
parameter_type, required, response_status, response_type, example
```

**Expert Profile** (Everything, including complex schema references):
```
[All Advanced fields] + schema_composition, conditional_schemas, security_scopes, x-* fields
```

---

## Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Form response time | <2s for 500 operations | Measure page load + form render |
| OAS import fidelity | 100% data preservation | Compare original vs re-exported OAS |
| CSV round-trip | 100% accuracy | Import CSV, export CSV, verify identical |
| User error reduction | 50% fewer invalid specs | Pre-form vs post-form error rates |
| Non-technical usability | Business user completes spec in <20 min | User testing sessions |
| Validation coverage | All OAS 3.0 & 3.1 features supported | Feature matrix test |
| Document generation quality | Professional, exportable to PDF | Stakeholder review |

---

## Constraints & Assumptions

### Constraints
- Must support OAS 3.0.x and 3.1.x only (no Swagger 2.0 in Phase 1)
- CSV profiles are tiered (Basic → Advanced → Expert) to manage complexity
- Surgical editing requires OAS as canonical format
- Browser storage limits form state to ~5MB (users with huge specs must use direct API)

### Assumptions
- Users have JavaScript enabled and modern browser (Chrome, Firefox, Safari)
- Existing OAS files are mostly valid (we provide import error messages, not repair)
- CSV import is secondary use case; primary is form UI
- Users want professional PDF output (not just YAML download)

---

## Out of Scope (Phase 1)

- Swagger 2.0 (OpenAPI 2.0) support
- GraphQL schema import
- Automatic code generation from spec
- Real-time collaboration (multiple users editing simultaneously)
- Git-based version control integration
- Custom branding for generated PDFs
- Webhook event simulation/testing

---

## Technical Integration Points

### Backend Services Required
1. **OAS Parser Service** (existing from Feature 003)
   - Parse YAML/JSON OAS
   - Validate against OpenAPI schema
   - Extract entities (operations, models, etc.)

2. **OAS Transformer** (new)
   - Merge original OAS + user edits
   - Apply surgical edit tracking
   - Resolve conflicts

3. **CSV Handler** (new)
   - Parse tiered CSV formats
   - Generate CSV from OAS
   - Validate CSV imports

4. **Document Generator** (new)
   - Convert OAS → Markdown
   - Render Markdown → HTML
   - Export HTML → PDF

### Frontend Components Required
1. **Form Builder** - Multi-tab interface with profile selection
2. **OAS Viewer** - Read-only OAS JSON viewer for Expert mode
3. **CSV Editor** - Grid-based CSV import/export UI
4. **Validation Panel** - Real-time error/warning display
5. **Preview Panel** - Live document generation preview
6. **Undo/Redo** - Full transaction history

---

## Definitions of Done

- [x] Specification complete and approved
- [ ] Architecture plan created with component design
- [ ] Task breakdown generated (TDD approach)
- [ ] Unit tests defined for OAS transformation logic
- [ ] E2E tests defined for import/export workflows
- [ ] All OAS 3.0 & 3.1 constructs covered in tests
- [ ] Form UI responsive on desktop/tablet
- [ ] CSV import/export 100% reversible
- [ ] Surgical editing preserves untouched OAS structures
- [ ] PDF generation produces professional output
- [ ] All acceptance scenarios pass
- [ ] Performance targets met (form <2s, export <5s)
- [ ] Documentation complete

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| OAS complexity overwhelming users | Users avoid form, edit raw YAML | Medium | Progressive disclosure + extensive tooltips + tiered profiles |
| Edit-path identity ambiguity | Lost/incorrect edits | Medium | Hybrid approach: ref-based + fingerprint + user warnings |
| CSV round-trip data loss | Users lose data on import/export | Low | Comprehensive testing + validation before import |
| PDF generation performance | Generating PDF for large specs slow | Low | Lazy load + async generation, allow browser PDF print as fallback |
| Browser storage quota exceeded | Form state lost for large specs | Low | Offer cloud backup (future), guide users to API endpoint |

---

## Next Steps

1. **Planning Phase**: Create detailed architecture plan with component design
2. **Task Breakdown**: Generate actionable, dependency-ordered tasks with TDD approach
3. **Implementation**: Backend OAS transformation → Frontend form UI → Integration
4. **Validation**: Test with Feature 003 export output + real-world OAS specs

