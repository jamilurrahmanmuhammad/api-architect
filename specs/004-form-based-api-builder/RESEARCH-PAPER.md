# Research Paper: Form-Based OpenAPI Documentation Builder

**Title**: A Multi-Format API Documentation System with OpenAPI as Canonical Model
**Date**: 2025-12-16
**Version**: 2.3 (Revised)
**Author**: API Architect Research Team
**Revision Notes**: v2.3 adds formal specifications (named guarantees, path identity schema, system invariants, version mapping policies, YAML preservation). v2.2 added implementation considerations. v2.1 added surgical editing. v2.0 incorporated initial review feedback.

---

## Abstract

This paper presents the architectural design for a Form-Based API Documentation Builder that enables non-technical users to create valid OpenAPI specifications through an intuitive form-based UI, with CSV serving as an interchange format for import/export operations. The system establishes OpenAPI Specification (OAS) as the canonical model, with a Form UI as the primary authoring experience, CSV as a lossless transport format, and professional documents as one-way rendered outputs.

A key architectural feature is **lossless OAS import with surgical editing**: existing complex OAS files can be imported without any data loss, edited partially through the UI, and exported with only the touched fields modified while preserving all untouched structures (including complex compositions like allOf/oneOf, conditional schemas, and vendor extensions).

We provide comprehensive analysis of OAS 3.0.x and 3.1.x specifications, tiered CSV profiles for different user expertise levels, transformation strategies with formal semantic equality definitions, and detailed implementation considerations including edit-path identity challenges, tier guarantee clarifications, normalization boundaries, and extension handling strategies.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Architectural Decision: OAS as Canonical](#3-architectural-decision-oas-as-canonical)
4. [OpenAPI Specification Analysis](#4-openapi-specification-analysis)
5. [Layered Architecture](#5-layered-architecture)
6. [Form UI: Primary Authoring Experience](#6-form-ui-primary-authoring-experience)
7. [OAS Import & Surgical Editing](#7-oas-import--surgical-editing)
8. [CSV Schema Design](#8-csv-schema-design)
9. [Transformation Model](#9-transformation-model)
10. [Document Generation](#10-document-generation)
11. [Validation & Error Handling](#11-validation--error-handling)
12. [Governance & Change Control](#12-governance--change-control)
13. [Explicit Non-Goals](#13-explicit-non-goals)
14. [Implementation Strategy](#14-implementation-strategy)
15. [System Invariants](#15-system-invariants-quick-reference)
16. [Architectural Decision Records](#16-architectural-decision-records)
17. [Conclusion](#17-conclusion)
18. [Appendices](#18-appendices)

---

## 1. Introduction

### 1.1 Background

The OpenAPI Specification (OAS) is the industry standard for describing RESTful APIs. However, the YAML/JSON syntax presents a barrier for non-technical stakeholders such as business analysts, product managers, and technical writers who need to document APIs.

### 1.2 Objective

Design a system that:
- Provides an intuitive **form-based UI** as the primary authoring experience
- Allows **CSV import/export** for bulk operations and system integration
- Produces valid, standards-compliant OpenAPI specifications
- Generates professional documentation for stakeholder consumption
- Maintains fidelity between formats with clear semantic equality definitions

### 1.3 Scope

- OpenAPI Specification versions 3.0.x (3.0.0 through 3.0.4)
- OpenAPI Specification versions 3.1.x (3.1.0, 3.1.1)
- Form-based UI design for primary authoring
- Tiered CSV profiles (Basic, Advanced, Expert)
- Professional document generation (PDF/HTML)

### 1.4 Key Design Principles

| Principle | Description |
|-----------|-------------|
| **OAS as Canonical** | OpenAPI Specification is the single source of truth |
| **Form UI as Primary** | Non-technical users interact via guided forms, not raw files |
| **CSV as Interchange** | CSV is for import/export, not primary authoring |
| **Progressive Disclosure** | Complexity revealed only when needed |
| **Semantic Equality** | Round-trip correctness defined by meaning, not text |
| **Surgical Editing** | UI edits modify only touched fields; untouched structures preserved exactly |
| **Lossless Import** | Any valid OAS can be imported with zero data loss |

---

## 2. Problem Statement

### 2.1 Current Challenges

| Challenge | Description |
|-----------|-------------|
| Technical Barrier | OAS requires knowledge of YAML/JSON syntax |
| Learning Curve | Understanding OAS structure takes significant time |
| Error-Prone | Manual YAML editing leads to syntax errors |
| Accessibility | Non-technical users cannot participate in API documentation |
| Collaboration | Different teams need different views of the same data |
| Cognitive Overload | Full OAS complexity overwhelms casual users |

### 2.2 Requirements

1. **Non-Technical Access**: Enable form-based API documentation
2. **Standards Compliance**: Output must be valid OAS
3. **Tiered Complexity**: Progressive disclosure for different user levels
4. **Import/Export**: CSV for bulk operations and migration
5. **Professional Output**: Generate stakeholder-ready documents
6. **Version Support**: Support both OAS 3.0.x and 3.1.x families

### 2.3 Target User Personas

| Persona | Technical Level | Primary Interface | Use Case |
|---------|-----------------|-------------------|----------|
| Business Analyst | Low | Form UI (Basic) | Document API requirements |
| Product Manager | Low | Form UI (Basic) | Define API contracts |
| Technical Writer | Medium | Form UI (Advanced) | Create comprehensive docs |
| API Developer | High | Form UI / CSV | Bulk import existing specs |
| API Architect | Expert | CSV / Direct OAS | Full control, migration |

---

## 3. Architectural Decision: OAS as Canonical

### 3.1 Decision

**OpenAPI Specification is the canonical (master) format. All other representations derive from and synchronize with OAS.**

### 3.2 Rationale

| Factor | Custom Canonical | OAS as Canonical |
|--------|------------------|------------------|
| Schema Maintenance | We maintain | OpenAPI Initiative maintains |
| Validation Tools | Build from scratch | Existing (Spectral, AJV, etc.) |
| Ecosystem Compatibility | Limited | Full (Swagger, Postman, etc.) |
| Data Fidelity | Potential loss | Lossless |
| Industry Adoption | None | Universal |
| Future Evolution | Our responsibility | Community responsibility |

### 3.3 Implications

1. Internal storage format is OAS (YAML/JSON)
2. Form UI reads/writes OAS structure
3. CSV is derived from OAS schema
4. All transformations preserve OAS semantics
5. Validation uses OAS JSON Schema

### 3.4 Artifact Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARTIFACT RELATIONSHIPS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────┐                          │
│                    │                 │                          │
│                    │   OAS SPEC      │◄─── CANONICAL            │
│                    │   (Standard)    │     (Source of Truth)    │
│                    │                 │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│          ┌──────────────────┼──────────────────┐               │
│          │                  │                  │               │
│          ▼                  ▼                  ▼               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│  │               │ │               │ │               │        │
│  │   FORM UI     │ │     CSV       │ │   DOCUMENT    │        │
│  │   (Primary)   │ │ (Interchange) │ │   (Render)    │        │
│  │               │ │               │ │               │        │
│  └───────────────┘ └───────────────┘ └───────────────┘        │
│         │                  │                  │                │
│         │    BIDIRECTIONAL │    ONE-WAY       │                │
│         └──────────────────┴──────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Transformation Matrix

|        | TO: Form UI | TO: CSV | TO: OAS | TO: Document |
|--------|-------------|---------|---------|--------------|
| **FROM: Form UI** | - | ✓ Export | ✓ Save | ✓ Generate |
| **FROM: CSV** | ✓ Import | - | ✓ Convert | ✓ Generate |
| **FROM: OAS** | ✓ Load | ✓ Export | - | ✓ Generate |
| **FROM: Document** | ✗ Cannot | ✗ Cannot | ✗ Cannot | - |

---

## 4. OpenAPI Specification Analysis

### 4.1 Version Family Strategy

**Decision**: Generalize by version family (3.0.x, 3.1.x) rather than individual patch versions.

**Justification** (per OpenAPI Initiative):
> "Patch versions address errors in, or provide clarifications to, this document, not the feature set. Tooling which supports OAS 3.1 SHOULD be compatible with all OAS 3.1.* versions."

Source: [OpenAPI Blog - Patch Releases Announcement](https://www.openapis.org/blog/2024/10/25/announcing-openapi-specification-patch-releases)

### 4.2 OAS 3.0.x Complete Object Model

**Source**: [OpenAPI 3.0.3 Specification](https://spec.openapis.org/oas/v3.0.3.html)

#### 4.2.1 Root Objects

| Object | Description | Required |
|--------|-------------|----------|
| openapi | Version string (3.0.x) | Yes |
| info | API metadata | Yes |
| servers | Server URLs | No |
| paths | API endpoints | Yes |
| components | Reusable schemas | No |
| security | Security requirements | No |
| tags | Tag definitions | No |
| externalDocs | External documentation | No |

#### 4.2.2 Info Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | API title |
| version | string | Yes | API version |
| description | string | No | API description (Markdown) |
| termsOfService | string | No | URL to ToS |
| contact | Contact Object | No | Contact information |
| license | License Object | No | License information |

#### 4.2.3 Schema Object (3.0.x)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | Data type |
| format | string | No | Format hint |
| nullable | boolean | No | **Nullable flag (3.0.x only)** |
| readOnly | boolean | No | Read-only flag |
| writeOnly | boolean | No | Write-only flag |
| deprecated | boolean | No | Deprecation flag |
| enum | [any] | No | Allowed values |
| example | any | No | **Single example (3.0.x)** |
| exclusiveMaximum | boolean | No | **Boolean in 3.0.x** |
| exclusiveMinimum | boolean | No | **Boolean in 3.0.x** |
| allOf | [Schema] | No | All-of composition |
| oneOf | [Schema] | No | One-of composition |
| anyOf | [Schema] | No | Any-of composition |
| not | Schema | No | Not composition |

#### 4.2.4 Security Scheme Types (3.0.x)

| Type | Description |
|------|-------------|
| apiKey | API key authentication |
| http | HTTP authentication |
| oauth2 | OAuth 2.0 |
| openIdConnect | OpenID Connect |

### 4.3 OAS 3.1.x Changes from 3.0.x

**Source**: [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0.html)

#### 4.3.1 Key Differences

| Feature | OAS 3.0.x | OAS 3.1.x |
|---------|-----------|-----------|
| JSON Schema | Draft-04 (subset) | Draft 2020-12 (full) |
| nullable | `nullable: true` | `type: ["string", "null"]` |
| exclusiveMinimum | boolean | number |
| exclusiveMaximum | boolean | number |
| example | Single value | **examples** array |
| Security types | 4 types | 5 types (+mutualTLS) |
| Webhooks | Not supported | Top-level object |
| Path Items | Inline only | Reusable in components |
| License | name + url | +identifier (SPDX) |
| Info | Standard fields | +summary |

#### 4.3.2 New in 3.1.x

| Feature | Description |
|---------|-------------|
| webhooks | Top-level webhook definitions |
| components.pathItems | Reusable path item objects |
| mutualTLS | New security scheme type |
| info.summary | Short API summary |
| license.identifier | SPDX license identifier |
| JSON Schema 2020-12 | Full JSON Schema support |

#### 4.3.3 New JSON Schema Keywords (3.1.x)

| Keyword | Description |
|---------|-------------|
| if/then/else | Conditional schemas |
| dependentRequired | Dependent required properties |
| dependentSchemas | Dependent schemas |
| prefixItems | Tuple validation |
| contains | Array contains |
| unevaluatedItems | Unevaluated items |
| unevaluatedProperties | Unevaluated properties |
| const | Constant value |
| $comment | Schema comment |

### 4.4 Version Compatibility Mapping Policy

When converting between OAS 3.0.x and 3.1.x, certain fields require explicit mapping rules. This section defines those policies.

#### 4.4.1 Example vs Examples Mapping

OAS 3.0.x uses `example` (singular value), while OAS 3.1.x adopts JSON Schema 2020-12's `examples` (array).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXAMPLE/EXAMPLES MAPPING POLICY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OAS 3.0.x (singular):          OAS 3.1.x (array):                         │
│  ─────────────────────          ────────────────────                        │
│  example: "Fido"                examples:                                   │
│                                   - "Fido"                                  │
│                                   - "Rex"                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Scenario | Policy |
|----------|--------|
| **Import 3.0 → Internal** | Store as `example` (singular); also create `examples: [value]` for unified access |
| **Import 3.1 → Internal** | Store as `examples` (array); also set `example` to first item for compatibility |
| **Export → 3.0** | Use `example` field; if multiple examples exist, use first and warn user |
| **Export → 3.1** | Use `examples` array; `example` field is omitted (JSON Schema style) |

#### 4.4.2 Nullable Mapping

OAS 3.0.x uses `nullable: true`, while OAS 3.1.x uses type arrays.

| Scenario | Policy |
|----------|--------|
| **Import 3.0 `nullable: true`** | Store both `nullable: true` AND `type: ["<type>", "null"]` |
| **Import 3.1 `type: ["string", "null"]`** | Store type array; also set `nullable: true` for compatibility |
| **Export → 3.0** | Use `nullable: true`; collapse type array to single type |
| **Export → 3.1** | Use type array; omit `nullable` field |

#### 4.4.3 Exclusive Min/Max Mapping

OAS 3.0.x uses boolean, OAS 3.1.x uses numeric values.

| Scenario | 3.0.x Format | 3.1.x Format |
|----------|--------------|--------------|
| **Exclusive minimum** | `minimum: 5, exclusiveMinimum: true` | `exclusiveMinimum: 5` |
| **Exclusive maximum** | `maximum: 10, exclusiveMaximum: true` | `exclusiveMaximum: 10` |

| Scenario | Policy |
|----------|--------|
| **Import 3.0** | Store both formats internally |
| **Import 3.1** | Store numeric value; compute boolean equivalent |
| **Export → 3.0** | Use boolean format with separate min/max |
| **Export → 3.1** | Use numeric format directly |

#### 4.4.4 Internal Dual-Storage Strategy

To support seamless version conversion, the internal model stores **both formats** where they differ:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTERNAL DUAL-STORAGE MODEL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Internal Field Storage:                                                    │
│  {                                                                          │
│    "example": "Fido",           // 3.0 compatibility                       │
│    "examples": ["Fido"],        // 3.1 native                              │
│    "nullable": true,            // 3.0 compatibility                       │
│    "type": ["string", "null"],  // 3.1 native                              │
│    "_sourceVersion": "3.0.3"    // Track original version                  │
│  }                                                                          │
│                                                                             │
│  On export, the target version determines which fields are emitted.        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This dual-storage approach ensures:
1. **No information loss** during version conversion
2. **Round-trip stability** within the same version
3. **Clear upgrade/downgrade paths** between versions

---

## 5. Layered Architecture

### 5.1 Four-Layer Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYERED ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: DOCUMENT OUTPUT (One-way Render)                           │   │
│  │ • PDF / HTML / DOCX                                                 │   │
│  │ • Human-readable, not machine-reversible                            │   │
│  │ • Stakeholder consumption                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │ renders                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: CSV INTERCHANGE (Import/Export Format)                     │   │
│  │ • Lossless transport format                                         │   │
│  │ • Tiered profiles: Basic / Advanced / Expert                        │   │
│  │ • Bulk operations, migration, system integration                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │ exports/imports                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: FORM UI (Primary Authoring Experience)                     │   │
│  │ • Spreadsheet-like interface with guardrails                        │   │
│  │ • Progressive disclosure                                            │   │
│  │ • Validation with human-readable errors                             │   │
│  │ • Non-canonical helper columns for UX                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │ reads/writes                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: OAS CANONICAL (Source of Truth)                            │   │
│  │ • OpenAPI 3.0.x / 3.1.x                                             │   │
│  │ • YAML or JSON storage                                              │   │
│  │ • Industry standard, tooling compatible                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Layer Responsibilities

| Layer | Role | Primary Users | Reversible |
|-------|------|---------------|------------|
| OAS Canonical | Source of truth | System internal | N/A |
| Form UI | Primary authoring | All users | Yes |
| CSV Interchange | Import/export | Power users, integrations | Yes |
| Document Output | Stakeholder delivery | Executives, clients | No |

---

## 6. Form UI: Primary Authoring Experience

### 6.1 Design Philosophy

The Form UI is the **primary interface** for non-technical users. It provides:

1. **Guided Experience**: Wizard-like flow for new users
2. **Spreadsheet Familiarity**: Table-based editing for data entry
3. **Progressive Disclosure**: Basic fields first, advanced on demand
4. **Contextual Help**: Inline documentation and examples
5. **Real-time Validation**: Immediate feedback on errors

### 6.2 Authoring Profiles

| Profile | Target User | Exposed Features | Hidden Features |
|---------|-------------|------------------|-----------------|
| **Business** | BA, PM | Paths, summaries, descriptions, examples | Schema constraints, security details |
| **Technical** | Developer | Full schemas, parameters, responses | Conditional schemas, composition |
| **Security** | Security team | Security schemes, scopes, requirements | Schema details |
| **Expert** | Architect | Everything | Nothing |

### 6.3 UI Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FORM UI STRUCTURE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ NAVIGATION TABS                                                      │  │
│  │ [API Info] [Servers] [Models] [Endpoints] [Security] [Export]        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PROFILE SELECTOR                                                     │  │
│  │ ( ) Business  ( ) Technical  ( ) Security  (●) Expert                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ CONTENT AREA (Example: Models Tab)                                   │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Models List          │ Field Editor                            │ │  │
│  │  │ ──────────────       │ ────────────                            │ │  │
│  │  │ > Pet (5 fields)     │ Field: name                             │ │  │
│  │  │   Category           │ Type: [string ▼]                        │ │  │
│  │  │   Order              │ Required: [✓]                           │ │  │
│  │  │   User               │ Description: [___________]              │ │  │
│  │  │                      │ Example: [___________]                  │ │  │
│  │  │ [+ Add Model]        │                                         │ │  │
│  │  │                      │ ── Advanced (click to expand) ──        │ │  │
│  │  │                      │ Min Length: [__]  Max Length: [__]      │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ VALIDATION PANEL                                                     │  │
│  │ ⚠ 2 warnings  ✗ 0 errors                                            │  │
│  │ • Pet.status: Consider adding enum values                           │  │
│  │ • Order.shipDate: Example value recommended                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Non-Canonical Helper Columns

The Form UI may include helper columns that improve UX but are **not serialized** to OAS:

| Helper Column | Purpose | Serialized? |
|---------------|---------|-------------|
| `_display_order` | Custom sort order in UI | No |
| `_notes` | Internal author notes | No (or x-notes) |
| `_status` | Draft/Review/Approved | No (or x-status) |
| `_last_modified_by` | Change tracking | No |

These helpers exist only in the UI layer and are regenerated on import.

---

## 7. OAS Import & Surgical Editing

### 7.1 Two Distinct Guarantees (Terminology)

This system provides two separate guarantees that must not be conflated:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TWO NAMED GUARANTEES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GUARANTEE 1: LOSSLESS IMPORT                                               │
│  ────────────────────────────                                               │
│  Definition: Any valid OAS file is stored exactly as provided              │
│  Condition:  Unconditional — always true                                   │
│  Mechanism:  OAS IS the canonical format; we store it directly             │
│                                                                             │
│  GUARANTEE 2: LOSSLESS VIEW/EDIT                                            │
│  ──────────────────────────────                                             │
│  Definition: UI edits modify only touched fields; untouched parts survive  │
│  Condition:  Depends on implementation of identity strategy + export       │
│  Mechanism:  Surgical editing with path tracking + merge on export         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY THIS DISTINCTION MATTERS:                                              │
│                                                                             │
│  • Lossless Import is UNCONDITIONAL — we promise it always                 │
│  • Lossless View/Edit is CONDITIONAL — depends on correct implementation   │
│    of identity tracking, never normalizing on export, conflict resolution  │
│                                                                             │
│  Conflating them risks over-promising. A bug in the edit tracker breaks    │
│  Guarantee 2 but not Guarantee 1.                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Guarantee | What It Promises | Can It Break? |
|-----------|------------------|---------------|
| **Lossless Import** | Imported OAS is stored exactly | No (by design) |
| **Lossless View/Edit** | Edits don't destroy hidden parts | Yes (if implementation is buggy) |

### 7.2 Lossless Import (Guarantee 1)

Any valid OpenAPI Specification file can be imported into the system with **zero data loss**.

#### 7.2.1 The Import Guarantee

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOSSLESS IMPORT GUARANTEE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GUARANTEE: import(any-valid-oas.yaml) stores 100% of the original data    │
│                                                                             │
│  What is preserved:                                                         │
│  ✓ All paths, operations, parameters                                       │
│  ✓ All schemas (including complex compositions)                            │
│  ✓ allOf / oneOf / anyOf / not                                             │
│  ✓ if / then / else (JSON Schema 2020-12)                                  │
│  ✓ $ref references (structure preserved)                                   │
│  ✓ Vendor extensions (x-*)                                                 │
│  ✓ Discriminators                                                          │
│  ✓ Callbacks and webhooks                                                  │
│  ✓ Security schemes and requirements                                       │
│  ✓ All metadata and descriptions                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7.2.2 Why Lossless Import Works

Since OAS is the **canonical format**, importing an OAS file means storing the source of truth directly:

| Step | Action | Data Loss |
|------|--------|-----------|
| 1 | Parse OAS YAML/JSON | None (standard parsing) |
| 2 | Validate against OAS schema | None (validation only) |
| 3 | Store in internal format | None (OAS IS the internal format) |
| 4 | Display in UI | None (UI is a view, not a transform) |

### 7.3 Lossless View/Edit (Guarantee 2)

**Critical Concept**: The Form UI is a **view** of the OAS data, not a transformation of it.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      UI AS A VIEW (NOT TRANSFORMATION)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────────────────┐                      │
│                        │     INTERNAL STORAGE        │                      │
│                        │     (Complete OAS)          │                      │
│                        │                             │                      │
│                        │  • All paths                │                      │
│                        │  • All schemas              │                      │
│                        │  • All compositions         │                      │
│                        │  • All extensions           │                      │
│                        │  • Everything               │                      │
│                        └──────────────┬──────────────┘                      │
│                                       │                                     │
│                    ┌──────────────────┼──────────────────┐                  │
│                    │                  │                  │                  │
│                    ▼                  ▼                  ▼                  │
│           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│           │ BASIC VIEW   │   │ADVANCED VIEW │   │ EXPERT VIEW  │           │
│           │              │   │              │   │              │           │
│           │ Shows: 20%   │   │ Shows: 60%   │   │ Shows: 100%  │           │
│           │ Hides: 80%   │   │ Hides: 40%   │   │ Hides: 0%    │           │
│           │              │   │              │   │              │           │
│           │ Data stored: │   │ Data stored: │   │ Data stored: │           │
│           │ 100%         │   │ 100%         │   │ 100%         │           │
│           └──────────────┘   └──────────────┘   └──────────────┘           │
│                                                                             │
│  KEY INSIGHT: Hidden ≠ Deleted                                             │
│  Data not shown in a view is still stored and will be exported             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Surgical Editing Model

When a user edits via the UI, the system performs **surgical edits** on the OAS structure:

- **Touched fields**: Updated with new values
- **Untouched fields**: Remain exactly as imported
- **Complex structures**: Preserved even if not displayed in current view

#### 7.3.1 Surgical Edit Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SURGICAL EDIT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: IMPORT COMPLEX OAS                                                 │
│  ──────────────────────────                                                 │
│                                                                             │
│  components:                                                                │
│    schemas:                                                                 │
│      Pet:                                                                   │
│        allOf:                              ◄── Complex composition          │
│          - $ref: '#/components/schemas/Base'                               │
│          - type: object                                                     │
│            properties:                                                      │
│              name:                                                          │
│                type: string                ◄── User will edit this         │
│              status:                                                        │
│                type: string                                                 │
│        x-internal: true                    ◄── Vendor extension            │
│        if:                                 ◄── Conditional schema          │
│          properties:                                                        │
│            status: { const: "sold" }                                       │
│        then:                                                                │
│          required: [soldDate]                                              │
│                                                                             │
│  STEP 2: USER EDITS IN UI                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  User adds to Pet.name:                                                     │
│    • description: "The pet's name"                                         │
│    • maxLength: 100                                                         │
│                                                                             │
│  STEP 3: INTERNAL UPDATE (SURGICAL)                                         │
│  ──────────────────────────────────                                         │
│                                                                             │
│  System locates exact path:                                                 │
│    components.schemas.Pet.allOf[1].properties.name                         │
│                                                                             │
│  System applies ONLY the changes:                                           │
│    + description: "The pet's name"                                         │
│    + maxLength: 100                                                         │
│                                                                             │
│  System does NOT touch:                                                     │
│    • allOf structure                                                        │
│    • $ref reference                                                         │
│    • x-internal extension                                                   │
│    • if/then conditional                                                    │
│    • Any other field                                                        │
│                                                                             │
│  STEP 4: EXPORT                                                             │
│  ─────────────                                                              │
│                                                                             │
│  components:                                                                │
│    schemas:                                                                 │
│      Pet:                                                                   │
│        allOf:                              ◄── PRESERVED                    │
│          - $ref: '#/components/schemas/Base'  ◄── PRESERVED                │
│          - type: object                                                     │
│            properties:                                                      │
│              name:                                                          │
│                type: string                                                 │
│                description: "The pet's name"  ◄── ADDED                    │
│                maxLength: 100                 ◄── ADDED                    │
│              status:                                                        │
│                type: string                ◄── PRESERVED                   │
│        x-internal: true                    ◄── PRESERVED                   │
│        if:                                 ◄── PRESERVED                   │
│          properties:                                                        │
│            status: { const: "sold" }                                       │
│        then:                               ◄── PRESERVED                   │
│          required: [soldDate]                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7.3.2 What Gets Preserved

| OAS Feature | Edited in UI? | Preserved on Export? |
|-------------|---------------|----------------------|
| Simple fields you edit | Yes | Updated |
| Simple fields you don't edit | No | Preserved exactly |
| allOf / oneOf / anyOf | Typically no | Preserved exactly |
| if / then / else | Typically no | Preserved exactly |
| $ref references | Structure no | Preserved exactly |
| Vendor extensions (x-*) | Optional | Preserved exactly |
| Discriminators | Expert only | Preserved exactly |
| Callbacks | Expert only | Preserved exactly |
| Webhooks | Expert only | Preserved exactly |
| Comments in YAML | N/A | Best effort |

### 7.5 The Mathematical Guarantee

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SURGICAL EDIT GUARANTEE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Let:                                                                       │
│    OAS_original = imported OAS file                                        │
│    edits = set of field changes made in UI                                 │
│    OAS_exported = exported OAS file                                        │
│                                                                             │
│  Then:                                                                      │
│    OAS_exported = OAS_original + edits                                     │
│                                                                             │
│  More precisely:                                                            │
│    ∀ path P in OAS_original:                                               │
│      if P ∈ edits:                                                         │
│        OAS_exported[P] = edits[P]     // Updated                           │
│      else:                                                                  │
│        OAS_exported[P] = OAS_original[P]  // Unchanged                     │
│                                                                             │
│  CONSEQUENCE:                                                               │
│    If you make zero edits, export equals import (semantically)             │
│    If you edit one field, only that field changes                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Practical Implications

| Scenario | Behavior |
|----------|----------|
| Import enterprise OAS with custom extensions | All x-* extensions preserved |
| Import OAS with complex inheritance (allOf) | Inheritance structure preserved |
| Edit description of one field | Only that description changes |
| Switch between Basic and Expert view | No data loss, just different visibility |
| Export after viewing without editing | Identical to original (semantically) |
| Import OAS 3.1.x with webhooks | Webhooks preserved even in Basic view |

### 7.7 Implementation Requirements

To achieve surgical editing, the system must:

1. **Store OAS as-is**: No normalization or transformation on import
2. **Track edit paths**: Know exactly which OAS paths were modified
3. **Merge on export**: Apply edits to original structure
4. **Preserve ordering**: Maintain key order where possible (YAML)
5. **Handle deep paths**: Support edits to deeply nested structures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ Original OAS    │ ─── Stored immutably on import                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ Edit Tracker    │ ─── Records: { path: newValue } for each change       │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ Merge Engine    │ ─── On export: original + edits = result              │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ Exported OAS    │ ─── Original structure with surgical updates          │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.8 Implementation Challenge: Edit-Path Identity

A subtle but critical challenge in surgical editing is **stable path identity** — how to reliably address elements in complex, nested OAS structures.

#### 7.8.1 The Problem

Consider this OAS structure:

```yaml
Pet:
  allOf:
    - $ref: '#/components/schemas/Base'
    - type: object
      properties:
        name:
          type: string    # User edits this
```

The edit path would be: `components.schemas.Pet.allOf[1].properties.name`

**The challenge**: Array indices like `[1]` are fragile. If someone reorders the `allOf` array, or if a different tool normalizes the order, the index-based path breaks.

#### 7.8.2 Where This Problem Appears

| Structure | Problem |
|-----------|---------|
| `allOf` / `oneOf` / `anyOf` arrays | Item order may vary between tools |
| `examples` arrays | No inherent identity for array items |
| `servers` arrays | Order is meaningful but not stable |
| `parameters` arrays | Same parameter can appear in different positions |
| `security` arrays | Order of security requirements |

#### 7.8.3 Possible Approaches

| Approach | Description | Tradeoffs |
|----------|-------------|-----------|
| **Index-based** | Use array indices (`allOf[1]`) | Simple but fragile if order changes |
| **Content hashing** | Identify items by hash of their content | Stable but breaks if item content changes |
| **Structural anchors** | Use `$anchor` or `$id` for addressability | Requires OAS to have anchors (not always present) |
| **Composite keys** | Combine multiple fields for identity (e.g., `$ref` value) | Works for refs, not for inline schemas |
| **Insertion-order preservation** | Never reorder on import; treat original order as canonical | Simple and effective for most cases |

#### 7.8.4 Recommended Strategy

For this system, we recommend a **hybrid approach**:

1. **Preserve original order strictly** — Never reorder arrays on import
2. **Use content-based identity for refs** — `$ref` values are natural identifiers
3. **Use index + content verification for inline schemas** — Store index AND a content fingerprint; warn if fingerprint changes
4. **Provide conflict resolution UI** — When paths become ambiguous, surface to user

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PATH IDENTITY STRATEGY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  For $ref items:     Use the $ref value as identity                        │
│                      e.g., allOf[$ref='#/components/schemas/Base']         │
│                                                                             │
│  For inline items:   Use index + content fingerprint                       │
│                      e.g., allOf[1:hash=a3f2b1]                            │
│                                                                             │
│  On mismatch:        Warn user, offer manual resolution                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This challenge is an important consideration for any system implementing surgical editing on tree-structured documents.

#### 7.8.5 Formal Path Identity Schema

To prevent ad-hoc implementations, we define a formal schema for the edit tracker's internal representation:

```typescript
/**
 * Path Identity Schema v1.0
 * Defines how edit paths are stored and resolved
 */

// A single segment in a path
type PathSegment =
  | { type: 'key'; value: string }                           // Object key: "schemas"
  | { type: 'index'; value: number; fingerprint?: string }   // Array index with optional fingerprint
  | { type: 'ref'; value: string }                           // $ref-based identity: "#/components/schemas/Pet"
  | { type: 'name'; field: string; value: string };          // Named identity: operationId="getPet"

// A complete path to a location in the OAS
interface OASPath {
  segments: PathSegment[];
  version: number;              // Schema version for migration
  toString(): string;           // Human-readable: "components.schemas.Pet.allOf[1].properties.name"
}

// A single edit operation
interface EditOperation {
  id: string;                   // UUID for this edit
  path: OASPath;                // Where the edit applies
  operation: 'set' | 'delete' | 'insert' | 'move';
  oldValue?: unknown;           // Previous value (for undo)
  newValue?: unknown;           // New value
  timestamp: string;            // ISO 8601
  source: 'ui' | 'csv' | 'api'; // How the edit was made
}

// The complete edit tracker state
interface EditTracker {
  schemaVersion: '1.0';
  originalOASHash: string;      // SHA-256 of original for integrity check
  edits: EditOperation[];       // Ordered list of edits
  conflicts: ConflictRecord[];  // Any detected conflicts
}

// When path identity becomes ambiguous
interface ConflictRecord {
  editId: string;
  reason: 'fingerprint_mismatch' | 'index_out_of_bounds' | 'ref_not_found';
  suggestedResolution?: OASPath;
  requiresUserInput: boolean;
}
```

#### 7.8.6 Path Resolution Examples

| OAS Location | Path Representation |
|--------------|---------------------|
| `info.title` | `[{type:'key',value:'info'}, {type:'key',value:'title'}]` |
| `paths./pets.get` | `[{type:'key',value:'paths'}, {type:'key',value:'/pets'}, {type:'key',value:'get'}]` |
| `components.schemas.Pet.allOf[0]` (ref) | `[..., {type:'ref',value:'#/components/schemas/Base'}]` |
| `components.schemas.Pet.allOf[1]` (inline) | `[..., {type:'index',value:1,fingerprint:'a3f2b1c4'}]` |
| `paths./pets.get` (by operationId) | `[{type:'name',field:'operationId',value:'listPets'}]` |

#### 7.8.7 Conflict Detection and Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFLICT DETECTION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  On Export:                                                                 │
│  ──────────                                                                 │
│  1. For each edit in EditTracker.edits:                                    │
│     a. Resolve path against current OAS                                    │
│     b. If resolution fails:                                                │
│        - Check fingerprint (content changed?)                              │
│        - Check index bounds (array resized?)                               │
│        - Check $ref target (ref renamed?)                                  │
│     c. If conflict detected:                                               │
│        - Add to ConflictRecord                                             │
│        - Attempt auto-resolution (nearby match)                            │
│        - If unresolvable, flag requiresUserInput=true                      │
│                                                                             │
│  2. Present conflicts to user:                                             │
│     "The field at Pet.allOf[1].name has changed since your edit.           │
│      Your edit: Added description 'The pet name'                           │
│      Current state: Field was moved to allOf[2]                            │
│      [Apply to new location] [Discard edit] [Manual resolve]"              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.9 YAML Comments and Ordering: Policy Decision

YAML files can contain comments and have meaningful key ordering. This section documents an explicit policy decision.

#### 7.9.1 The Challenge

```yaml
# API Version History:
# v1.0 - Initial release (2024-01)
# v1.1 - Added pet categories (2024-03)
# v1.2 - Security update (2024-06)
openapi: "3.1.0"
info:
  title: Pet Store API
  # TODO: Update description before launch
  description: |
    A sample API for pet store operations.
```

When this YAML is parsed to an object graph, **comments are lost**. Standard JSON/YAML parsers do not preserve comments.

#### 7.9.2 Options Considered

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **A: Store raw YAML alongside parsed** | Keep original text + object graph | Storage overhead, sync complexity |
| **B: Use CST/AST parser** | Parse to concrete syntax tree preserving comments | Complex editing, limited library support |
| **C: Comment preservation non-goal** | Explicitly state comments will be lost | Simple, but may lose enterprise users |
| **D: Best-effort preservation** | Preserve where possible, warn on loss | Unpredictable behavior |

#### 7.9.3 Policy Decision

**This system adopts Option A with explicit warnings:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    YAML PRESERVATION POLICY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT WE PRESERVE:                                                          │
│  ✓ All data content (guaranteed by Lossless Import)                        │
│  ✓ Key ordering within objects (best effort, store original order)         │
│  ✓ Original raw YAML (stored separately for reference/diff)                │
│                                                                             │
│  WHAT WE DO NOT GUARANTEE:                                                  │
│  ✗ YAML comments in exported output                                        │
│  ✗ Exact whitespace/formatting                                             │
│  ✗ Trailing newlines, quote styles                                         │
│                                                                             │
│  USER WARNING ON IMPORT:                                                    │
│  "This file contains YAML comments. Comments will be preserved in the      │
│   original file reference but will not appear in exported YAML. To         │
│   preserve comments, use the 'Export with original formatting' option."    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7.9.4 Implementation Approach

| Component | Storage |
|-----------|---------|
| **Original YAML** | Stored as raw text blob, immutable |
| **Parsed OAS** | Object graph for editing |
| **Edits** | Patch set against parsed OAS |
| **Export (default)** | Re-serialize from parsed + edits (clean YAML, no comments) |
| **Export (preserve)** | Apply edits to original raw YAML where possible |

The "Export with original formatting" option attempts to surgically patch the original YAML text, preserving comments in unchanged sections. This is **best-effort** and may fail for complex edits.

#### 7.9.5 Rationale

1. **Enterprise users** often embed important metadata in comments (review dates, TODOs, change history)
2. **Complete loss** of comments would be a dealbreaker for some organizations
3. **Storing original** is cheap and provides audit trail
4. **Best-effort preservation** on export gives users a choice
5. **Clear warnings** prevent surprise data loss

---

## 8. CSV Schema Design

### 8.1 Reframed Role of CSV

> **CSV is a lossless transport format for import/export operations, not the primary authoring interface.**

CSV serves:
- Bulk data import from existing documentation
- Export for backup and version control
- System integration with other tools
- Power user operations

### 8.2 CSV Profile Tiers

#### 8.2.1 Three-Tier System

| Tier | Sheets | Fields | Target User | Coverage |
|------|--------|--------|-------------|----------|
| **Basic** | 5 | ~50 | Business Analyst | 80% use cases |
| **Advanced** | 10 | ~120 | Technical Writer | 95% use cases |
| **Expert** | 15-17 | ~200 | API Architect | 100% OAS |

> **Important Clarification on Lossless Guarantees**
>
> **Lossless round-trip guarantees apply only when using the Expert CSV profile.** Basic and Advanced profiles are intentionally simplified abstractions that omit advanced OAS features (composition, conditional schemas, callbacks, etc.). Data created in Basic/Advanced tiers can always be exported to OAS without loss, but importing a complex OAS into Basic/Advanced CSV will not capture all fields.
>
> | Tier | OAS → CSV | CSV → OAS |
> |------|-----------|-----------|
> | Basic | Lossy (fields omitted) | Lossless (what's there is preserved) |
> | Advanced | Lossy (some fields omitted) | Lossless |
> | Expert | Lossless | Lossless |

#### 8.2.2 Basic Profile (5 Sheets)

| # | Sheet | Fields | Purpose |
|---|-------|--------|---------|
| 1 | api-info | 6 | Title, version, description, contact |
| 2 | models | 8 | Model name, description, key fields |
| 3 | model-fields | 10 | Field name, type, required, description, example |
| 4 | operations | 8 | Path, method, summary, description, tags |
| 5 | responses | 6 | Operation, status, description, schema ref |

**Excluded from Basic**: Security schemes, callbacks, links, webhooks, advanced schema constraints, composition (allOf/oneOf/anyOf).

#### 8.2.3 Advanced Profile (10 Sheets)

Adds to Basic:
| # | Sheet | Fields | Purpose |
|---|-------|--------|---------|
| 6 | servers | 6 | Server URLs and variables |
| 7 | parameters | 12 | Path, query, header parameters |
| 8 | request-bodies | 6 | Request body definitions |
| 9 | security-schemes | 10 | Security definitions |
| 10 | examples | 5 | Reusable examples |

#### 8.2.4 Expert Profile (15-17 Sheets)

Full OAS coverage:
| # | Sheet | Fields | Purpose |
|---|-------|--------|---------|
| 11 | tags | 4 | Tag definitions |
| 12 | response-headers | 8 | Response headers |
| 13 | security-requirements | 4 | Security requirements |
| 14 | links | 8 | Response links |
| 15 | callbacks | 7 | Callback definitions |
| 16 | webhooks (3.1.x) | 12 | Webhook definitions |
| 17 | path-items (3.1.x) | 13 | Reusable path items |

### 8.3 CSV Format Conventions

| Convention | Description | Example |
|------------|-------------|---------|
| Required fields | Asterisk suffix in header | `title*` |
| Arrays | Semicolon-separated | `tag1;tag2;tag3` |
| Objects | JSON string | `{"key": "value"}` |
| References | @model: prefix | `@model:Pet` |
| Empty values | Leave cell empty | (no NULL keyword) |
| Escaping | Standard CSV | Double quotes for commas |
| Boolean | Lowercase | `true`, `false` |

### 8.4 Field Mapping to OAS

| CSV Column | OAS Path | Type |
|------------|----------|------|
| title* | info.title | string |
| version* | info.version | string |
| model_name* | components.schemas.{name} | string |
| field_name* | properties.{name} | string |
| type* | properties.{name}.type | string |
| required | required[] | boolean |
| description | description | string |
| example | example (3.0) / examples (3.1) | any |

---

## 9. Transformation Model

### 9.1 Semantic Equality Definition

**Critical**: Round-trip correctness is defined by **semantic equality**, not textual equality.

#### 9.1.1 What Semantic Equality Means

Two OAS documents are semantically equal if:
1. They describe the same API contract
2. They would validate the same requests/responses
3. They would generate equivalent client code

#### 9.1.2 Allowed Variations (Still Equal)

| Variation | Example | Equal? |
|-----------|---------|--------|
| Key ordering | `{a:1, b:2}` vs `{b:2, a:1}` | ✓ Yes |
| Formatting | Pretty vs minified | ✓ Yes |
| Default omission | `required: false` vs omitted | ✓ Yes |
| Explicit vs implicit | `type: object` vs inferred | ✓ Yes |
| Equivalent refs | Inline vs $ref (same content) | ✓ Yes |

#### 9.1.3 Not Equal (Semantic Difference)

| Variation | Example | Equal? |
|-----------|---------|--------|
| Missing required field | `required: [id]` vs `required: [id, name]` | ✗ No |
| Different type | `type: string` vs `type: integer` | ✗ No |
| Different constraints | `maxLength: 100` vs `maxLength: 50` | ✗ No |

### 9.2 Canonical Normalization Layer

Before comparison, OAS documents pass through normalization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CANONICAL NORMALIZATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input OAS ──► Normalization Pipeline ──► Canonical OAS                     │
│                                                                             │
│  Steps:                                                                     │
│  1. Parse YAML/JSON to object graph                                        │
│  2. Sort all object keys alphabetically                                    │
│  3. Expand implicit defaults (required: false, etc.)                       │
│  4. Normalize $ref paths (consistent casing)                               │
│  5. Remove undefined/null values                                           │
│  6. Serialize to canonical JSON                                            │
│                                                                             │
│  Result: Two semantically equal documents produce identical output         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Critical Architectural Boundary: Normalization vs Export**
>
> Normalization and export serve **different pipelines** and must be kept strictly separate:
>
> | Pipeline | Purpose | Uses Normalization? |
> |----------|---------|---------------------|
> | **Comparison** | Verify semantic equality | ✓ Yes — normalize both, compare |
> | **Export** | Produce output OAS | ✗ Never — use original structure + edits |
>
> **Why this matters**: If normalization is accidentally used during export, it would:
> - Reorder keys (breaking user's preferred structure)
> - Expand implicit defaults (bloating the output)
> - Potentially break the surgical editing guarantee
>
> The export pipeline must always use: `original_oas + surgical_edits = exported_oas`
>
> Normalization is a **read-only comparison tool**, never a transformation step.

### 9.3 Round-Trip Guarantee

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUND-TRIP GUARANTEE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROPERTY: normalize(CSV → OAS → CSV → OAS) = normalize(CSV → OAS)         │
│                                                                             │
│  In plain terms:                                                            │
│  • Convert CSV to OAS                                                       │
│  • Convert back to CSV                                                      │
│  • Convert again to OAS                                                     │
│  • The two OAS documents are semantically identical                        │
│                                                                             │
│  This is verified by:                                                       │
│  1. Normalizing both OAS documents                                         │
│  2. Comparing canonical JSON output                                        │
│  3. Running OAS validator on both                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.4 Transformation Pipelines

#### 9.4.1 CSV → OAS

```
CSV Files ──► CSV Parser ──► Validator ──► Assembler ──► OAS Builder ──► OAS File
                  │              │             │              │
                  │              │             │              └─ Serialize YAML/JSON
                  │              │             └─ Build nested objects
                  │              └─ Check required fields, types
                  └─ Parse each sheet, handle arrays/JSON
```

#### 9.4.2 OAS → CSV

```
OAS File ──► OAS Parser ──► Version Detect ──► Flattener ──► CSV Writer ──► CSV Files
                  │              │                 │              │
                  │              │                 │              └─ Generate sheets
                  │              │                 └─ Extract by section
                  │              └─ Choose 3.0.x or 3.1.x schema
                  └─ Parse YAML/JSON
```

### 9.5 Extension Handling

OAS vendor extensions (`x-*`) are preserved through a dual approach:

| Approach | Mechanism |
|----------|-----------|
| Known extensions | Dedicated columns (e.g., `x_internal`) |
| Unknown extensions | `extensions` column with JSON object |

#### 9.5.1 The Extension Strategy Tradeoff

There's an inherent tension in how to handle vendor extensions in CSV:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTENSION STRATEGY TRADEOFF                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OPTION A: First-Class Columns                                              │
│  ─────────────────────────────                                              │
│  x-internal → dedicated "x_internal" column                                 │
│  x-deprecated-at → dedicated "x_deprecated_at" column                       │
│                                                                             │
│  ✓ Pros: Discoverable, type-safe, validatable                              │
│  ✗ Cons: CSV schema grows with each new extension                          │
│          Requires schema updates when new extensions appear                 │
│                                                                             │
│  OPTION B: Generic JSON Blob                                                │
│  ───────────────────────────                                                │
│  All x-* → single "extensions" column with JSON: {"x-internal": true, ...} │
│                                                                             │
│  ✓ Pros: Schema-stable, handles any extension                              │
│  ✗ Cons: Less discoverable, no per-field validation                        │
│          Harder for non-technical users                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.5.2 Recommended Hybrid Strategy

| Extension Type | Handling | Rationale |
|----------------|----------|-----------|
| **Widely-used** (x-internal, x-deprecated) | First-class columns | Worth the schema investment |
| **Organization-specific** | Generic JSON blob | Avoids infinite schema growth |
| **Unknown/new** | Generic JSON blob | Future-proof |

**Promotion criteria** for moving an extension to first-class:
1. Used by >50% of imported OAS files in the system
2. Has a well-defined type (boolean, string, etc.)
3. Users frequently need to filter/sort by this extension

#### 9.5.3 Long-Term Recommendation

For maximum maintainability, consider treating **all** `x-*` extensions uniformly as a map unless explicitly promoted to first-class fields. This:
- Keeps CSV schema stable over time
- Avoids "schema churn" when new extensions become popular
- Maintains a clear promotion path for important extensions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTENSION LIFECYCLE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  New extension appears → Generic JSON blob                                  │
│           │                                                                 │
│           ▼                                                                 │
│  Usage grows → Monitor frequency                                            │
│           │                                                                 │
│           ▼                                                                 │
│  Meets promotion criteria → Add first-class column (non-breaking)          │
│           │                                                                 │
│           ▼                                                                 │
│  Migration → Auto-extract from JSON blob to new column                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Document Generation

### 10.1 Why Documents Cannot Reverse

| Information | In OAS/CSV | In Document | Loss |
|-------------|------------|-------------|------|
| $ref structure | Preserved | Inline expanded | Structure |
| Composition logic | allOf/oneOf/anyOf | Merged description | Logic |
| Extensions (x-*) | All preserved | Selectively shown | Data |
| Exact types | Precise JSON Schema | Human-readable | Precision |
| Discriminator | Full mapping | Simplified | Mapping |

### 10.2 Document Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROFESSIONAL DOCUMENT STRUCTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. COVER PAGE                                                              │
│     • API Title, Version, Date, Logo                                        │
│                                                                             │
│  2. TABLE OF CONTENTS                                                       │
│                                                                             │
│  3. EXECUTIVE SUMMARY                                                       │
│     • API description, key features                                         │
│                                                                             │
│  4. AUTHENTICATION                                                          │
│     • Security schemes, example requests                                    │
│                                                                             │
│  5. BASE URLs                                                               │
│     • Server list, environments                                             │
│                                                                             │
│  6. DATA MODELS                                                             │
│     • Schema tables, examples                                               │
│                                                                             │
│  7. API ENDPOINTS                                                           │
│     • Grouped by tag, request/response details                              │
│                                                                             │
│  8. ERROR HANDLING                                                          │
│     • Error codes, response format                                          │
│                                                                             │
│  9. APPENDIX                                                                │
│     • Changelog, glossary                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Output Formats

| Format | Use Case | Technology |
|--------|----------|------------|
| PDF | Formal documentation | Puppeteer, WeasyPrint |
| HTML | Web hosting | Static site generation |
| DOCX | Microsoft Office | docx library |
| Markdown | Developer docs | Direct generation |

---

## 11. Validation & Error Handling

### 11.1 Validation Strategy

| Layer | Validation Type | Tools |
|-------|-----------------|-------|
| OAS Schema | JSON Schema validation | AJV |
| OAS Semantics | Linting rules | Spectral |
| CSV Format | Structure validation | Custom |
| Business Rules | Custom constraints | Custom |

### 11.2 Human-Readable Error Messages

**Critical**: Errors must map to **row + column + sheet** for non-technical users.

#### 11.2.1 Error Mapping

| Technical Error | User-Friendly Error |
|-----------------|---------------------|
| `paths./pets.get.responses is required` | **Operations sheet, row 3**: Missing response definition for "GET /pets" |
| `components.schemas.Pet.properties.id.type is invalid` | **Model Fields sheet, row 5**: Invalid type "integr" for field "id" in model "Pet". Did you mean "integer"? |
| `$ref '#/components/schemas/Unknown' not found` | **Operations sheet, row 7**: Response references model "Unknown" which doesn't exist. Available models: Pet, Order, User |

#### 11.2.2 Error Severity Levels

| Level | Icon | Description | Blocks Export? |
|-------|------|-------------|----------------|
| Error | ✗ | Invalid OAS, must fix | Yes |
| Warning | ⚠ | Valid but suspicious | No |
| Info | ℹ | Suggestion for improvement | No |

### 11.3 Validation UX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VALIDATION PANEL                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✗ 2 Errors (must fix before export)                                       │
│  ├─ Model Fields › Pet › id › type                                         │
│  │  "integr" is not a valid type. Valid types: string, integer, ...        │
│  │  [Go to field] [Auto-fix: integer]                                      │
│  │                                                                          │
│  └─ Operations › GET /pets › responses                                      │
│     Missing response definition. At least one response required.            │
│     [Go to operation] [Add 200 response]                                   │
│                                                                             │
│  ⚠ 3 Warnings                                                               │
│  ├─ Pet.status: No example provided                                        │
│  ├─ POST /pets: No request body description                                │
│  └─ User.email: Consider adding format: email                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Governance & Change Control

### 12.1 CSV Schema Versioning

| Version | Changes | Migration |
|---------|---------|-----------|
| csv-schema-1.0 | Initial release | N/A |
| csv-schema-1.1 | Added `examples` column | Auto-migrate `example` → `examples` |
| csv-schema-2.0 | Breaking: renamed columns | Migration script required |

### 12.2 Breaking vs Non-Breaking Changes

| Change Type | Example | Handling |
|-------------|---------|----------|
| Add optional column | New `summary` column | Non-breaking, auto-defaults |
| Rename column | `desc` → `description` | Breaking, migration needed |
| Remove column | Remove `nullable` (3.1.x) | Breaking, migration needed |
| Change type | `required: bool` → `required: string` | Breaking |

### 12.3 Backward Compatibility Rules

1. New optional columns: Always allowed
2. Column removal: Deprecate first, remove in next major version
3. Column rename: Provide migration script
4. CSV schema version: Embedded in header row or metadata file

---

## 13. Explicit Non-Goals

To prevent scope creep, this system explicitly does **NOT** aim to:

| Non-Goal | Rationale |
|----------|-----------|
| Replace Swagger Editor | Different target user (developers vs non-technical) |
| Real-time collaborative editing | Complexity; defer to future version |
| Schema inference from examples | AI feature; out of scope |
| API mocking/simulation | Separate concern |
| Code generation | Use existing OAS tools |
| API testing | Use Postman, etc. |
| API versioning strategy | Business decision, not tool concern |
| GraphQL/gRPC support | REST/OpenAPI only |

---

## 14. Implementation Strategy

### 14.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| CSV Parser | PapaParse | Robust CSV handling |
| OAS Parser | @readme/openapi-parser | Industry standard |
| Validation | Spectral, AJV | OAS + JSON Schema |
| PDF Generation | Puppeteer | Headless Chrome |
| HTML Generation | Handlebars/React | Template flexibility |
| UI Framework | React + TanStack Table | Spreadsheet-like UX |
| State Management | Zustand | Lightweight |
| Form Handling | React Hook Form + Zod | Type-safe forms |

### 14.2 Implementation Phases

| Phase | Deliverable | Priority |
|-------|-------------|----------|
| 1 | OAS canonical storage + basic CRUD | High |
| 2 | Form UI (Basic profile) | High |
| 3 | CSV import/export (Basic profile) | High |
| 4 | Validation with human-readable errors | High |
| 5 | Document generation (PDF/HTML) | Medium |
| 6 | Advanced/Expert profiles | Medium |
| 7 | Authoring profiles (Business/Technical) | Medium |
| 8 | Polish and optimization | Low |

### 14.3 Testing Strategy

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| Unit | Transformers, validators | Vitest |
| Integration | Round-trip transforms | Vitest |
| Contract | OAS schema compliance | AJV, Spectral |
| E2E | Full workflow | Playwright |
| Snapshot | Document output | Vitest snapshots |
| Semantic Equality | Normalized comparison | Custom |

---

## 15. System Invariants (Quick Reference)

This section consolidates all system invariants — guarantees that must **always hold true**. Use this as a checklist during implementation and code review.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM INVARIANTS                                    │
│                    (Must Always Be True)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA INTEGRITY INVARIANTS                                                  │
│  ─────────────────────────                                                  │
│  INV-01: Never reorder arrays on import or export                          │
│  INV-02: Never drop unknown vendor extensions (x-*)                        │
│  INV-03: Never normalize during export (only for comparison)               │
│  INV-04: Edits are patch-set applied to original, never replacement        │
│  INV-05: Original imported OAS is stored immutably                         │
│                                                                             │
│  TRANSFORMATION INVARIANTS                                                  │
│  ─────────────────────────                                                  │
│  INV-06: OAS → CSV → OAS produces semantically equal OAS (Expert tier)     │
│  INV-07: CSV → OAS → CSV produces identical CSV (Expert tier)              │
│  INV-08: Import followed by immediate export equals original (semantic)    │
│                                                                             │
│  UI INVARIANTS                                                              │
│  ─────────────────────────                                                  │
│  INV-09: Hidden data (lower tier view) is never deleted                    │
│  INV-10: Switching views never loses data                                  │
│  INV-11: UI validation errors map to specific row/column/sheet             │
│                                                                             │
│  VERSION COMPATIBILITY INVARIANTS                                           │
│  ─────────────────────────                                                  │
│  INV-12: 3.0→3.1 conversion preserves all information                      │
│  INV-13: 3.1→3.0 conversion warns on feature loss                          │
│  INV-14: Internal model stores dual formats for version-specific fields    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.1 Invariant Details

| ID | Invariant | Violation Consequence | Test Strategy |
|----|-----------|----------------------|---------------|
| INV-01 | Never reorder arrays | Breaks path identity, edit tracking | Snapshot comparison on round-trip |
| INV-02 | Never drop x-* | Data loss | Assert all x-* present after transform |
| INV-03 | Normalization is comparison-only | Destroys original structure | Code review, static analysis |
| INV-04 | Edits are patches | Overwrites untouched data | Unit test edit tracker |
| INV-05 | Original is immutable | Loses audit trail | Immutable storage pattern |
| INV-06 | OAS→CSV→OAS equality | Lossy transformation | Round-trip test suite |
| INV-07 | CSV→OAS→CSV equality | Lossy transformation | Round-trip test suite |
| INV-08 | Import+export = original | Unnecessary changes | Diff test on import/export |
| INV-09 | Hidden ≠ deleted | Silent data loss | Tier switching tests |
| INV-10 | View switch is safe | Silent data loss | State comparison tests |
| INV-11 | Errors have location | Useless error messages | UI error mapping tests |
| INV-12 | 3.0→3.1 lossless | Data loss on upgrade | Version conversion tests |
| INV-13 | 3.1→3.0 warns | Silent feature loss | Warning assertion tests |
| INV-14 | Dual format storage | Version conversion breaks | Schema validation tests |

### 15.2 Acceptance Tests for Invariants

Each invariant should have corresponding acceptance tests:

```
describe('System Invariants', () => {

  // INV-01: Array ordering
  test('imported OAS array order is preserved on export', () => {
    const original = loadOAS('complex-allof.yaml');
    const exported = importThenExport(original);
    expect(getArrayOrder(exported, 'allOf')).toEqual(getArrayOrder(original, 'allOf'));
  });

  // INV-02: Extension preservation
  test('all vendor extensions survive round-trip', () => {
    const original = loadOAS('with-extensions.yaml');
    const exported = importThenExport(original);
    expect(getAllExtensions(exported)).toEqual(getAllExtensions(original));
  });

  // INV-08: Import + export = original
  test('immediate export equals import (semantic)', () => {
    const original = loadOAS('petstore.yaml');
    const exported = importThenExport(original);
    expect(semanticEquals(normalize(original), normalize(exported))).toBe(true);
  });

  // INV-09: Hidden data preserved
  test('switching to Basic view does not delete Advanced fields', () => {
    const state = importOAS('complex.yaml');
    switchView(state, 'Basic');
    switchView(state, 'Expert');
    expect(state.hasAllOriginalFields()).toBe(true);
  });

});
```

---

## 16. Architectural Decision Records

### ADR-001: OAS as Canonical Model

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Need single source of truth for API definitions |
| Decision | OpenAPI Specification is the canonical format |
| Rationale | Industry standard, existing tooling, future-proof |
| Consequences | All other formats derive from OAS |

### ADR-002: Form UI as Primary Interface

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Non-technical users need accessible interface |
| Decision | Form-based UI is primary, CSV is interchange |
| Rationale | Spreadsheets expose too much complexity |
| Consequences | Invest in UI/UX, CSV is secondary |

### ADR-003: One-Way Document Rendering

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Documents needed for stakeholders |
| Decision | Documents are rendered output, not reversible |
| Rationale | Rendering loses structural information |
| Consequences | Documents cannot be imported back |

### ADR-004: Semantic Equality for Round-Trip

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Need to verify transformation correctness |
| Decision | Use semantic equality, not textual |
| Rationale | Textual equality too brittle |
| Consequences | Need normalization layer |

### ADR-005: Tiered CSV Profiles

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Full OAS in CSV is overwhelming |
| Decision | Three tiers: Basic, Advanced, Expert |
| Rationale | Progressive disclosure, 80/20 rule |
| Consequences | Multiple CSV schemas to maintain |

### ADR-006: Surgical Editing for OAS Import

| Aspect | Decision |
|--------|----------|
| Status | Accepted |
| Context | Users need to import existing OAS files and edit parts without losing untouched structures |
| Decision | Implement surgical editing - track edit paths and merge changes with original on export |
| Rationale | Lossless import is critical for enterprise adoption; users shouldn't fear data loss |
| Consequences | Must store original OAS immutably, track edits separately, merge on export |

---

## 17. Conclusion

### 17.1 Summary

This paper establishes a clear architectural foundation for a Form-Based API Documentation Builder:

1. **OAS as Canonical**: The OpenAPI Specification is the master format
2. **Form UI as Primary**: Non-technical users author via guided forms
3. **CSV as Interchange**: CSV is for import/export, not primary authoring
4. **Tiered Profiles**: Basic/Advanced/Expert for progressive disclosure
5. **Semantic Equality**: Round-trip defined by meaning, not text
6. **Document as Render**: Professional documents are one-way outputs
7. **Lossless Import**: Any valid OAS can be imported with zero data loss
8. **Surgical Editing**: Edit parts while preserving untouched structures exactly

### 17.2 Key Benefits

| Benefit | Description |
|---------|-------------|
| Accessibility | Non-technical users can create API specs |
| Standards Compliance | Output is valid, industry-standard OAS |
| Ecosystem Integration | Works with Swagger, Postman, etc. |
| Progressive Disclosure | Complexity revealed when needed |
| Robust Validation | Human-readable errors mapped to source |

### 17.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CSV complexity | Form UI as primary, CSV as interchange |
| Round-trip failures | Semantic equality + normalization |
| User overwhelm | Tiered profiles, progressive disclosure |
| Validation confusion | Human-readable errors with location |

### 17.4 Next Steps

1. Formalize as Feature 004 specification (`/sp.specify`)
2. Create implementation plan (`/sp.plan`)
3. Generate task breakdown (`/sp.tasks`)
4. Begin implementation with Phase 1

---

## 18. Appendices

### Appendix A: References

1. OpenAPI Initiative. (2021). *OpenAPI Specification v3.0.3*. https://spec.openapis.org/oas/v3.0.3.html
2. OpenAPI Initiative. (2021). *OpenAPI Specification v3.1.0*. https://spec.openapis.org/oas/v3.1.0.html
3. OpenAPI Initiative. (2024). *Announcing OpenAPI Specification Patch Releases*. https://www.openapis.org/blog/2024/10/25/announcing-openapi-specification-patch-releases
4. JSON Schema. (2020). *JSON Schema Draft 2020-12*. https://json-schema.org/draft/2020-12/json-schema-core.html
5. SPDX. *SPDX License List*. https://spdx.org/licenses/

### Appendix B: CSV Template Files

Location: `specs/004-form-based-api-builder/csv-schemas/`

```
csv-schemas/
├── README.md
├── SCHEMA-DEFINITION.md
├── oas-3.0.x/
│   └── (15 sheets)
└── oas-3.1.x/
    └── (17 sheets)
```

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| OAS | OpenAPI Specification |
| Canonical | The authoritative source of truth |
| Semantic Equality | Equivalence by meaning, not text |
| Progressive Disclosure | Revealing complexity gradually |
| Round-Trip | Convert A→B→A and verify equality |

---

**Document Version**: 2.3
**Last Updated**: 2025-12-16
**Status**: Research Complete - Ready for Specification Phase
**Revision History**:
- v1.0 (2025-12-16): Initial research paper
- v2.0 (2025-12-16): Incorporated expert review feedback - reframed CSV role, added tiered profiles, semantic equality, validation UX, governance, non-goals, ADRs
- v2.1 (2025-12-16): Added OAS Import & Surgical Editing section (Section 7), ADR-006 for surgical editing architecture
- v2.2 (2025-12-16): Added implementation considerations based on expert review - edit-path identity challenges, CSV tier guarantee clarifications, normalization vs export boundary, extension strategy tradeoffs
- v2.3 (2025-12-16): Added formal specifications based on expert review - named guarantees (Lossless Import vs Lossless View/Edit), formal Path Identity Schema with TypeScript types, System Invariants section (14 invariants with test strategies), version compatibility mapping policies (example/examples, nullable, exclusive min/max), YAML comments preservation policy
