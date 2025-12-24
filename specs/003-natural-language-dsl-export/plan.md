# Implementation Plan: Natural Language DSL & OpenAPI Export

**Feature**: 003-natural-language-dsl-export
**Spec Reference**: [spec.md](spec.md)
**Date**: 2025-12-13

## Architecture Overview

This feature modifies the existing DSL parser infrastructure (Feature 002) and adds new export functionality.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  EditorPane  │  PreviewPane  │  ExportDialog (NEW)              │
│     │              │                │                            │
│     └──────────────┼────────────────┘                            │
│                    │                                             │
│              useParser hook                                      │
│                    │                                             │
└────────────────────┼─────────────────────────────────────────────┘
                     │ POST /parse, POST /export (NEW)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                            │
├─────────────────────────────────────────────────────────────────┤
│  /api/v1/parse     │  /api/v1/export (NEW)                      │
│        │                     │                                   │
│        ▼                     ▼                                   │
│  ParserService        ExportService (NEW)                        │
│        │                     │                                   │
│        ▼                     │                                   │
│  ┌─────────────┐            │                                   │
│  │ DSL Parser  │◄───────────┘                                   │
│  │  (Modified) │                                                 │
│  └─────────────┘                                                │
│        │                                                         │
│        ▼                                                         │
│  ParsedRequirements ──────► OpenAPIGenerator (NEW)              │
│                                      │                           │
│                                      ▼                           │
│                              OpenAPI 3.0/3.1 YAML/JSON          │
└─────────────────────────────────────────────────────────────────┘
```

## Components to Modify/Create

### 1. DSL Parser (Modify Existing)

**Files:**
- `backend/dsl-parser/src/lexer.py` - Add LIST_ITEM token, remove TABLE tokens
- `backend/dsl-parser/src/parser.py` - Parse list syntax for fields, remove table parsing
- `backend/dsl-parser/src/dsl_ast.py` - Update FieldNode to include description
- `backend/dsl-parser/src/errors.py` - Add migration error for table syntax

**Key Changes:**

```python
# New token type
LIST_ITEM = auto()  # - field_name (type) - description

# New field syntax pattern
# - id (integer, required) - The unique identifier
# - name (string) - Optional description
# - tags (string[])
```

### 2. Export Service (New)

**Files:**
- `backend/editor-api/src/services/export_service.py` - OpenAPI generation logic
- `backend/editor-api/src/api/routes/export.py` - Export API endpoint
- `backend/editor-api/src/utils/openapi_generator.py` - OpenAPI spec builder
- `backend/editor-api/src/utils/example_generator.py` - Auto-generate example values

**OpenAPI Generation Logic:**

```python
class OpenAPIGenerator:
    def generate(self, parsed: ParsedRequirements, version: str = "3.0.3") -> dict:
        """Convert ParsedRequirements to OpenAPI spec."""
        return {
            "openapi": version,
            "info": self._build_info(parsed.services[0]),
            "servers": self._build_servers(parsed.services[0]),
            "paths": self._build_paths(parsed.operations),
            "components": {
                "schemas": self._build_schemas(parsed.models),
                "responses": self._build_responses(parsed.errors)
            }
        }
```

### 3. Frontend Export UI (New)

**Files:**
- `frontend/src/components/Editor/ExportDialog.tsx` - Export modal with format selection
- `frontend/src/components/Editor/ExportButton.tsx` - Toolbar button
- `frontend/src/hooks/useExport.ts` - Export API hook
- `frontend/src/services/exportService.ts` - Export API client

### 4. Example Value Generator (New)

**Smart example generation based on field name and type:**

| Field Pattern | Type | Example Value |
|---------------|------|---------------|
| `id` | integer | 1 |
| `*_id` | integer | 42 |
| `name` | string | "John Doe" |
| `email` | string | "user@example.com" |
| `phone` | string | "+1-555-0123" |
| `url`, `*_url` | string | "https://example.com" |
| `date`, `*_at` | datetime | "2025-01-15T10:30:00Z" |
| `price`, `amount` | number | 29.99 |
| `count`, `quantity` | integer | 5 |
| `is_*`, `has_*` | boolean | true |
| `description`, `bio` | string | "Lorem ipsum..." |
| Default string | string | "string" |
| Default integer | integer | 0 |
| Default number | number | 0.0 |
| Default boolean | boolean | false |

## Implementation Phases

### Phase 1: Parser Refactoring (Backend)
1. Update lexer to recognize list items (`- `)
2. Remove table token recognition
3. Update parser to parse list-based field definitions
4. Add migration error messages for table syntax
5. Update all parser tests

### Phase 2: Export Service (Backend)
1. Create OpenAPIGenerator class
2. Create ExampleGenerator class
3. Implement export service with format options
4. Create POST /export endpoint
5. Add export contract tests

### Phase 3: Frontend Integration
1. Create ExportDialog component
2. Add export button to editor toolbar
3. Implement download functionality
4. Add export success/error notifications

### Phase 4: Testing & Validation
1. End-to-end tests for export flow
2. Validate exported OpenAPI against Swagger Editor
3. Test with various DSL complexity levels

## DSL Syntax Examples

### Complete Natural Language Specification

```markdown
# Service: PetStore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API demonstrating the natural language DSL.
This API allows you to manage pets and their owners.

## Model: Pet
A pet available in the store.

- id (integer, required) - Unique identifier for the pet
- name (string, required) - Name of the pet
- status (string) - Pet status: available, pending, or sold
- category (Category) - Category this pet belongs to
- tags (string[]) - Tags for searching

## Model: Category
A category for organizing pets.

- id (integer, required) - Category identifier
- name (string, required) - Category name

## Model: Owner
A pet owner.

- id (integer, required) - Owner identifier
- name (string, required) - Owner's full name
- email (string, required) - Contact email
- pets (Pet[]) - Pets owned by this person

## Operation: GET /pets
List all available pets.

Query: status (string) - Filter by status
Query: limit (integer) - Maximum results to return
Returns: Pet[]

## Operation: GET /pets/{petId}
Get a specific pet by ID.

Path: petId (integer, required) - The pet ID
Returns: Pet

Errors:
- 404 Not Found - Pet does not exist

## Operation: POST /pets
Add a new pet to the store.

Body: Pet
Returns: Pet

Errors:
- 400 Bad Request - Invalid pet data

## Operation: DELETE /pets/{petId}
Remove a pet from the store.

Path: petId (integer, required) - The pet ID to delete
Returns: empty

Errors:
- 404 Not Found - Pet does not exist

## Error: 404 Not Found
The requested resource was not found.

## Error: 400 Bad Request
The request was invalid or malformed.
```

### Generated OpenAPI 3.0 Output

```yaml
openapi: 3.0.3
info:
  title: PetStore API
  version: 1.0.0
  description: |
    A sample Pet Store API demonstrating the natural language DSL.
    This API allows you to manage pets and their owners.

servers:
  - url: /api/v1

paths:
  /pets:
    get:
      summary: List all available pets
      parameters:
        - name: status
          in: query
          schema:
            type: string
          description: Filter by status
        - name: limit
          in: query
          schema:
            type: integer
          description: Maximum results to return
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
              example:
                - id: 1
                  name: "Fluffy"
                  status: "available"
    post:
      summary: Add a new pet to the store
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
      responses:
        '201':
          description: Pet created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '400':
          $ref: '#/components/responses/BadRequest'

  /pets/{petId}:
    get:
      summary: Get a specific pet by ID
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
          description: The pet ID
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      summary: Remove a pet from the store
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
          description: The pet ID to delete
      responses:
        '204':
          description: Pet deleted
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: integer
          description: Unique identifier for the pet
          example: 1
        name:
          type: string
          description: Name of the pet
          example: "Fluffy"
        status:
          type: string
          description: "Pet status: available, pending, or sold"
          example: "available"
        category:
          $ref: '#/components/schemas/Category'
        tags:
          type: array
          items:
            type: string
          description: Tags for searching
          example: ["cute", "friendly"]

    Category:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: integer
          description: Category identifier
          example: 1
        name:
          type: string
          description: Category name
          example: "Dogs"

    Owner:
      type: object
      required:
        - id
        - name
        - email
      properties:
        id:
          type: integer
          description: Owner identifier
          example: 42
        name:
          type: string
          description: Owner's full name
          example: "John Doe"
        email:
          type: string
          description: Contact email
          example: "user@example.com"
        pets:
          type: array
          items:
            $ref: '#/components/schemas/Pet'
          description: Pets owned by this person

  responses:
    NotFound:
      description: The requested resource was not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Not Found"
              message:
                type: string
                example: "The requested resource was not found."

    BadRequest:
      description: The request was invalid or malformed
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Bad Request"
              message:
                type: string
                example: "The request was invalid or malformed."
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Parser changes break existing functionality | High | Comprehensive test coverage, phased rollout |
| OpenAPI output doesn't validate | Medium | Test against Swagger Editor, use OpenAPI validator library |
| Example generation produces unrealistic values | Low | Pattern-based generation with sensible defaults |
| Performance degradation for large specs | Low | Benchmark and optimize generator |

## Dependencies

- **Feature 002**: Editor infrastructure, preview pane, backend API
- **pyyaml**: YAML generation for OpenAPI export
- **openapi-spec-validator**: Validate generated OpenAPI specs (optional, for testing)

## Success Metrics

1. Parser accepts all natural language DSL syntax examples
2. Exported OpenAPI validates in Swagger Editor
3. Round-trip: DSL -> OpenAPI -> Swagger UI displays correctly
4. Export completes in <2s for 1000-line specs
5. All existing Feature 002 E2E tests pass (with updated DSL syntax)

---

**Status**: Ready for Task Breakdown
**Next Step**: Generate tasks.md with TDD approach
