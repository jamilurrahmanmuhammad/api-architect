# Feature Specification: Natural Language DSL & OpenAPI Export

**Feature Branch**: `003-natural-language-dsl-export`
**Created**: 2025-12-13
**Status**: Draft
**Input**: Fix DSL usability issues from Feature 002 - replace complex table syntax with natural language, add OpenAPI export

## Problem Statement

Feature 002 (Requirements Grammar Authoring Studio) implemented a DSL parser that uses markdown table syntax for defining model fields:

```markdown
## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |
```

**Issues identified:**
1. **Table syntax is MORE complex than OpenAPI YAML** - defeats the purpose of a "simpler DSL"
2. **Violates Constitution Principle I** - "Plain-text requirements MUST be readable by non-technical stakeholders"
3. **No export capability** - users cannot download their specifications as OpenAPI/JSON/YAML
4. **No value delivered** - without export, the tool produces nothing usable

## User Scenarios & Testing

### User Story 1 - Write API Specs in Natural Language (Priority: P1)

A requirements engineer needs to write API specifications using natural, human-readable syntax that non-technical stakeholders can understand. The DSL should be simpler than OpenAPI YAML, not more complex.

**Why this priority**: Core usability fix. Without natural language syntax, the tool fails its primary value proposition.

**Acceptance Scenarios**:

1. **Given** a user opens the editor, **When** they write a model definition using list syntax like `- id (integer, required) - The unique identifier`, **Then** the parser accepts it and shows the model in preview
2. **Given** a user writes a complete API spec using natural language, **When** they view the preview, **Then** all services, models, operations, and errors are correctly parsed
3. **Given** a user familiar with API concepts but NOT the DSL, **When** they read an existing specification, **Then** they can understand it without documentation

---

### User Story 2 - Export to OpenAPI Format (Priority: P1)

A requirements engineer needs to export their authored specifications to industry-standard OpenAPI format (YAML/JSON) so they can use the specs with other tools (Swagger UI, code generators, API gateways).

**Why this priority**: Without export, the tool produces no usable output. This is the missing half of the value chain.

**Acceptance Scenarios**:

1. **Given** a user has a valid specification in the editor, **When** they click "Export", **Then** they see format options (OpenAPI 3.0 YAML, OpenAPI 3.0 JSON)
2. **Given** a user selects OpenAPI 3.0 YAML, **When** they click download, **Then** a valid OpenAPI 3.0 YAML file is downloaded
3. **Given** an exported OpenAPI file, **When** opened in Swagger Editor, **Then** it validates without errors
4. **Given** a specification with services, models, operations, and errors, **When** exported, **Then** all entities are present in the OpenAPI output with correct mappings

---

### User Story 3 - Clean Migration from Table Syntax (Priority: P2)

The system removes the complex table syntax entirely in favor of natural language. Existing files will show clear error messages guiding users to convert to the new syntax.

**Why this priority**: Clean break ensures simpler codebase and consistent user experience.

**Acceptance Scenarios**:

1. **Given** a file with old table syntax, **When** opened in the editor, **Then** an error message explains how to convert to natural language syntax
2. **Given** the error message, **When** the user reads it, **Then** they understand exactly how to rewrite their fields as list items

---

## Requirements

### Functional Requirements

**Natural Language DSL Syntax:**
- **FR-001**: System MUST accept natural language field definitions: `- field_name (type) - description` or `- field_name (type, required)`
- **FR-002**: System MUST accept simplified operation definitions with natural language parameters
- **FR-003**: System MUST parse description text as free-form natural language following entity headers
- **FR-004**: System SHOULD maintain backward compatibility with table syntax (graceful deprecation)

**OpenAPI Export:**
- **FR-005**: System MUST export parsed specifications to OpenAPI 3.0.x YAML format
- **FR-006**: System MUST export parsed specifications to OpenAPI 3.0.x JSON format
- **FR-007**: System MUST map DSL Service to OpenAPI info + servers
- **FR-008**: System MUST map DSL Models to OpenAPI components/schemas
- **FR-009**: System MUST map DSL Operations to OpenAPI paths with correct HTTP methods
- **FR-010**: System MUST map DSL Errors to OpenAPI components/responses
- **FR-011**: System MUST provide a download button in the editor UI
- **FR-012**: Exported files MUST validate against OpenAPI 3.0 specification

### DSL Syntax Specification

**Service Definition:**
```markdown
# Service: ServiceName
version: 1.0.0
base_path: /api/v1

Description of the service in natural language.
Multiple lines are supported.
```

**Model Definition:**
```markdown
## Model: ModelName
Description of the model in natural language.

- field_name (type, required) - Field description
- another_field (type) - Optional field description
- simple_field (type)
```

**Supported Types:**
- Primitives: `string`, `integer`, `number`, `boolean`
- Date/Time: `date`, `datetime`, `time`
- Complex: `object`, `array`
- References: `ModelName`, `ModelName[]` (array of model)

**Operation Definition:**
```markdown
## Operation: METHOD /path
Description of what the operation does.

Path: param_name (required) - Parameter description
Query: filter (string) - Optional query parameter
Body: ModelName
Returns: ModelName or ModelName[]

Errors:
- 404 Not Found - When resource doesn't exist
- 400 Bad Request - When validation fails
```

**Error Definition:**
```markdown
## Error: 404 Not Found
Description of when this error occurs.
```

### Key Entities

- **RequirementFile**: The DSL source file (unchanged from Feature 002)
- **Service**: API service with metadata
- **Model**: Data structure with fields defined using list syntax
- **Field**: Model field with name, type, required flag, and description
- **Operation**: API endpoint with method, path, parameters, body, response
- **Error**: Error definition with status code and description
- **OpenAPISpec**: Generated OpenAPI 3.0 specification object

## Success Criteria

- **SC-001**: New users can write a complete API spec without reading documentation (natural syntax)
- **SC-002**: Exported OpenAPI validates in Swagger Editor without errors
- **SC-003**: Non-technical stakeholders can read and understand DSL specifications
- **SC-004**: Export completes within 2 seconds for specs up to 1000 lines
- **SC-005**: 100% of DSL entities map to OpenAPI constructs

## Constraints & Assumptions

### Constraints
- Must integrate with existing Feature 002 infrastructure (editor, preview, backend)
- Parser changes must not break existing functionality
- Export format limited to OpenAPI 3.0.x for MVP (3.1 can be added later)

### Assumptions
- Users want OpenAPI output (industry standard)
- Natural language syntax is preferred over structured markup
- Backward compatibility with table syntax is lower priority than new syntax

## Non-Functional Requirements

- **Performance**: Export must complete within 2 seconds
- **Compatibility**: Exported OpenAPI must work with Swagger UI, Redoc, and major code generators
- **Usability**: DSL syntax must be learnable without documentation

---

## OpenAPI Mapping Reference

| DSL Construct | OpenAPI 3.0 Mapping |
|---------------|---------------------|
| Service name | info.title |
| Service version | info.version |
| Service base_path | servers[0].url |
| Service description | info.description |
| Model | components.schemas.{ModelName} |
| Model field | properties.{field_name} |
| Field (required) | required[] array |
| Operation | paths.{path}.{method} |
| Operation description | summary/description |
| Operation Path param | parameters (in: path) |
| Operation Query param | parameters (in: query) |
| Operation Body | requestBody |
| Operation Returns | responses.200 |
| Error | components.responses / responses.{code} |

---

## Clarifications (Resolved 2025-12-13)

1. **Example Values**: YES - Auto-generate realistic example values based on field types and names
2. **OpenAPI Versions**: Support OpenAPI 3.0.x AND 3.1.x (no Swagger 2.0)
3. **Table Syntax**: REMOVE - Clean break from old table syntax, only natural language supported
4. **Migration**: Existing files with table syntax will need manual conversion (one-time effort)
