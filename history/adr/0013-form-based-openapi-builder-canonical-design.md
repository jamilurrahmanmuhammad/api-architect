# ADR-0013: Form-Based OpenAPI Builder - OAS as Canonical Design

**Date**: 2025-12-18
**Status**: Proposed
**Authors**: API Architect Team
**Affected Components**: Frontend (Form UI), Backend (Transform Service), Database (OAS Storage)
**Feature**: Feature 004 - Form-Based OpenAPI Builder

---

## Context

The Form-Based OpenAPI Builder needs to support:
1. Non-technical users creating API specs via intuitive UI
2. Import of complex existing OAS files without data loss
3. Surgical editing (modify only touched fields)
4. CSV interchange for bulk operations
5. Professional document generation
6. Multiple authoring profiles (Business, Technical, Expert)

**Key Challenge**: How to maintain fidelity across multiple representations (OAS, Form, CSV) while allowing non-experts to edit safely?

---

## Decision

**OpenAPI Specification (OAS 3.0.x and 3.1.x) is the canonical (authoritative) format. All other representations (Form UI, CSV) are derived from and synchronized with OAS.**

### Architecture

```
┌─────────────────────────┐
│  OAS Canonical Store    │  ← Source of Truth
│  (YAML/JSON)            │     (PostgreSQL)
└────────────┬────────────┘
             │
     ┌───────┴────────┬──────────────┐
     │                │              │
     ▼                ▼              ▼
┌─────────┐   ┌───────────┐   ┌──────────┐
│ Form UI │   │ CSV Files │   │ Documents│
│ (React) │   │(Bulk Ops) │   │(PDF/HTML)│
└─────────┘   └───────────┘   └──────────┘
```

### Why OAS is Canonical

1. **Industry Standard**: OpenAPI Initiative maintains spec; we don't
2. **Validation Tooling**: Existing validators (Spectral, AJV, swagger-cli)
3. **Ecosystem Compatibility**: Works with Swagger UI, Postman, code generators
4. **Lossless Representation**: Can express any API spec without data loss
5. **Vendor Extensions**: Preserves x-* properties exactly
6. **Community Evolution**: Future OAS versions automatically supported

### Why NOT Custom Format

| Factor | Custom Format | OAS as Canonical |
|--------|---------------|------------------|
| Maintenance Burden | High (we maintain forever) | Low (OpenAPI Initiative) |
| Validator Support | Build from scratch | Existing tools |
| Ecosystem | Limited | Universal |
| Learning Curve | New to users | Users already know OAS |
| Vendor Lock-in | Yes | No |

---

## Implications

### 1. Storage Architecture
- **Store**: OAS (YAML or JSON) as primary blob in database
- **Indexing**: Extract operationId, paths, models into separate columns for search
- **Versioning**: Maintain edit transaction log (which fields changed, when)
- **No Custom Format**: Zero translation layer needed

### 2. Edit Tracking (Surgical Editing)
- **Track**: Which OAS paths were touched by user edits
- **Identity**: Use hybrid approach:
  - `$ref` values for references (stable across edits)
  - Array indices + content fingerprints for inline items
  - Original order preserved from import
- **Merge**: `merge(original_oas, edits) → result_oas`
  - Result includes original + user modifications
  - Untouched structures preserved exactly

### 3. Form UI Design
- **Read/Write**: Form reads OAS structure, writes OAS structure
- **State**: useReducer manages edits, tracks touched paths
- **Profiles**: Conditionally show fields based on profile
  - Basic: Paths, summaries, responses only
  - Advanced: +parameters, examples, validation
  - Technical: +composition (allOf/oneOf), conditional
  - Expert: Everything + raw OAS JSON view
- **No Translation**: No intermediate form schema; directly edit OAS

### 4. CSV Interchange
- **Direction**: OAS ↔ CSV (bidirectional)
- **Scope**: CSV is for import/export, not source of truth
- **Profiles**: Tiered representation
  - Basic: Subset of OAS (for business users)
  - Advanced: More fields (for developers)
  - Expert: Full OAS expressiveness
- **Limitations**: CSV cannot directly express allOf/oneOf; mitigate with Expert profile + JSON column

### 5. Import Behavior (Lossless Guarantee)
- **Any OAS In**: Preserve exactly as-is
  - Complex: allOf, oneOf, anyOf, not
  - Conditional: if/then/else schemas
  - Extensions: x-* properties untouched
  - Array Order: Never reorder from original
  - References: $ref integrity maintained
- **Edits Out**: Only modified fields are in edit transactions
- **Result**: Original structure visible in Expert mode; edits applied on top

### 6. Document Generation
- **Input**: OAS as canonical source
- **Process**: OAS → Markdown → HTML → PDF
- **Fidelity**: Professional documents match spec structure exactly
- **Non-Reversible**: PDF is output-only (no PDF → OAS reverse)

---

## Alternatives Considered

### Alternative 1: Custom Form Schema as Canonical

**Idea**: Define a custom "FormSchema" that the Form UI uses; translate Form ↔ OAS bidirectionally

**Rejected Because**:
- Requires maintaining custom schema forever
- We'd have to keep Form Schema in sync with OAS spec updates
- Introduces translation bugs and data loss risks
- Users unfamiliar with custom format
- No existing validation tooling

### Alternative 2: Hybrid (Form Schema + OAS)

**Idea**: Store both Form Schema and OAS; sync bidirectionally

**Rejected Because**:
- Same maintenance burden as Alternative 1
- Sync logic complex and error-prone
- Wastes storage (duplicate data)
- Violates single-source-of-truth principle

### Alternative 3: CSV as Canonical

**Idea**: Store CSV as primary; transform to OAS for export/validation

**Rejected Because**:
- CSV cannot represent complex OAS structures (allOf, oneOf)
- Loses vendor extensions on round-trip
- No native CSV validation
- Humans edit CSV ↔ harder to validate edits
- Not industry standard for APIs

---

## Consequences (Benefits)

✅ **Zero Translation Layer**: Direct OAS → Form, Form → OAS
✅ **100% Data Fidelity**: No data loss on import/export
✅ **Industry Alignment**: Compatible with all OAS tooling
✅ **Maintainability**: No custom schema to maintain
✅ **User Familiarity**: Users already know OAS
✅ **Vendor Extensions**: x-* properties preserved exactly
✅ **Extensibility**: Future OAS versions automatically supported
✅ **Surgical Editing**: Edit tracking maps directly to OAS paths (JsonPointer)

---

## Consequences (Tradeoffs)

⚠️ **Form Complexity**: Form must mirror OAS structure (mitigated by profiles)
⚠️ **Edit-Path Identity**: Tracking edits in complex schemas is subtle (mitigated by hybrid approach)
⚠️ **CSV Limitations**: CSV cannot express all OAS features (mitigated by Expert profile + JSON column)
⚠️ **Large Specs**: Very large OAS files may slow browser (mitigated by lazy loading + virtualization)

---

## Implementation Details

### Edit-Path Identity Strategy

**Problem**: How to reliably identify which element to edit in complex nested structures?

**Solution**: Hybrid approach

```typescript
type PathSegment =
  | { type: 'key'; value: string }           // Object key: "schemas"
  | { type: 'index'; value: number; fingerprint?: string }  // Array item
  | { type: 'ref'; value: string }           // $ref value: "#/components/schemas/Pet"
  | { type: 'name'; field: string; value: string }  // Named identity: operationId="getPet"

// Example paths:
// "components.schemas.Pet.allOf[$ref=#/components/schemas/Base]" // ref-based
// "paths./pets/{petId}.get.parameters[0:hash=a3f2b1]"           // index + fingerprint
```

### Merge Algorithm

```python
def merge(original_oas: dict, edit_transactions: List[EditTransaction]) -> dict:
    """
    Apply edits to original OAS, preserving untouched structures.

    Guarantees:
    - Only edited paths modified
    - Array order from original preserved
    - Vendor extensions (x-*) never lost
    - References ($ref) stable
    """
    result = deepcopy(original_oas)

    for transaction in edit_transactions:
        path = resolve_path(result, transaction.path)
        set_value(result, path, transaction.new_value)

    return result
```

### Storage Schema

```sql
CREATE TABLE specs (
    id UUID PRIMARY KEY,
    spec_id VARCHAR(255) UNIQUE,
    oas_content TEXT,           -- YAML or JSON
    version INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE edit_transactions (
    id UUID PRIMARY KEY,
    spec_id UUID REFERENCES specs(id),
    path VARCHAR(500),          -- JsonPointer format
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP
);

CREATE INDEX idx_spec_id ON specs(spec_id);
CREATE INDEX idx_spec_path ON edit_transactions(spec_id, path);
```

---

## Related Decisions

- **ADR-0014**: Edit-Path Identity System (forthcoming)
- **ADR-0015**: Form UI Profiles and Progressive Disclosure (forthcoming)
- **ADR-0016**: CSV Tiering Strategy (forthcoming)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-18 | OAS as canonical | Industry standard, lossless, tooling support |
| 2025-12-18 | Hybrid path identity | Balances stability vs simplicity |
| 2025-12-18 | Profiles for UX | Prevents cognitive overload |
| 2025-12-18 | Preserve original order | Stable edit tracking in arrays |

---

## Approval & Sign-Off

- [ ] Architect Review: _____________
- [ ] Team Lead Review: _____________
- [ ] Security Review: _____________
- [ ] Implementation Date: _____________

