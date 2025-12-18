<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version change: 0.0.0 (template) -> 1.0.0 (initial ratification)

Modified principles: N/A (initial creation)

Added sections:
  - Preamble: System purpose and novel contribution statement
  - 13 Core Principles derived from source constitution Articles 1-24 + Amendment XX
  - CIR Structure: Canonical Intermediate Representation specifications
  - Format-Specific Standards: OpenAPI, WSDL/XSD, JSON Schema, AsyncAPI, GraphQL
  - Governance Framework: Reusable patterns, versioning, deprecation, quality
  - Amendment Procedure: Semantic versioning and review process
  - Compliance Review: PR verification requirements

Removed sections: None (initial creation)

Templates requiring updates:
  - .specify/templates/plan-template.md: No changes required
  - .specify/templates/spec-template.md: No changes required
  - .specify/templates/tasks-template.md: No changes required

Follow-up TODOs: None

Source documents:
  - /mnt/c/mounted/open_api_architect_constitution_v2.txt (24 Articles)
  - /mnt/c/mounted/open_api_architect_constitution_ammendment1.txt (Article XX)
================================================================================
-->

# API Architect Constitution

## Preamble

This constitution establishes the foundational principles, architectural decisions, and operational rules for the Universal API Specification Authoring & Transformation System. The system bridges business language and technical specifications in a reversible, auditable, and industry-compliant manner.

This constitution incorporates findings from extensive research on existing tools, standards, and academic work including OpenAPI Generator, APIMatic Transformer, JXON architecture, Jsonix, Model-Driven Engineering research, W3C/IETF standards, AsyncAPI/GraphQL initiatives, and MuleSoft AMF.

This constitution acknowledges that NO EXISTING TOOL achieves true bidirectional round-tripping across all specification formats, positioning this system as a novel contribution to the field.

## Core Principles

### I. Text-First Authoring

The system MUST provide a single, text-first way to define integration requirements and automatically derive all technical artefacts. Plain-text requirements serve as the authoritative source of truth for all transformations.

**Non-negotiables:**
- Plain-text requirements MUST be readable by non-technical stakeholders
- Requirements MUST be precise enough to deterministically generate formal specifications
- All generated artefacts MUST trace back to source requirements
- The system MUST support progressive refinement (high-level to detailed)

### I.A. Interactive DSL Authoring Studio

The Requirements Grammar Authoring Studio (DSL Editor) MUST provide real-time, interactive authoring of specifications in a markdown-based Domain-Specific Language (DSL) optimised for API requirements definition.

**Editor Experience:**
- **Split-pane layout** with side-by-side editor and live preview, matching industry-standard UX patterns (Swagger Editor parity)
- **Real-time syntax validation** using best-effort incremental parsing; show valid entities parsed so far and flag unparseable sections clearly
- **Bidirectional selection**: Clicking a preview entity highlights its DSL definition and vice versa
- **Context-aware autocomplete** for DSL keywords and constructs, reducing authoring errors
- **Backend persistence** with version history, enabling collaboration and disaster recovery

**MVP DSL Scope:**
- Service definitions (name, metadata, base path)
- Models with basic types (string, number, boolean, object, array)
- Operations with HTTP semantics (GET, POST, PUT, PATCH, DELETE)
- Error definitions with status codes and descriptions
- Security constraints deferred to Phase 2

**Architecture Principles:**
- Cloud-native, microservices-oriented backend storage (open source technologies)
- Observability and service mesh integration as first-class citizens
- Plain-text, version-control-friendly DSL (no binary formats)
- Markdown-based syntax for human readability and simplicity

**Rationale:** Text-first authoring is only viable when the authoring experience is frictionless. The DSL editor removes barriers to entry while maintaining precision sufficient for deterministic specification generation. Real-time feedback (syntax validation, preview) reduces debugging cycles and builds user confidence. Incremental parsing and best-effort preview honor the reality of active editing: valid subsections should be usable even while other sections are incomplete.

### II. Multi-Format Output

The system MUST support generation of comprehensive output formats including:
- OpenAPI specifications (YAML/JSON, versions 2.0/Swagger, 3.0.x, 3.1.x)
- WSDL (1.1 and 2.0) and XSD (1.0 and 1.1)
- JSON Schemas (Draft-04 through Draft 2020-12)
- AsyncAPI specifications for event-driven APIs (2.x and 3.x)
- GraphQL SDL schemas
- Professional Word documents (REST, SOAP, Event-driven, Requirements)
- Test artefacts (Postman collections v2.1, Insomnia exports, BDD scenarios)
- Gateway proxies (Apigee, webMethods, Kong, AWS API Gateway, Azure APIM, MuleSoft)
- Mock server configurations (Prism, WireMock, MockServer)

The system MUST also support as authoritative inputs: RAML (0.8, 1.0), API Blueprint, Protobuf (.proto), Avro (.avsc).

### III. Canonical Intermediate Representation (CIR)

All transformations MUST occur via a Canonical Intermediate Representation that serves as the universal internal model. The CIR captures the SUPERSET of expressible semantics across all supported formats.

**CIR Requirements:**
- MUST capture service metadata, operations, data models, security definitions
- MUST support format origin annotations for round-trip reconstruction
- MUST be serialisable to human-readable format (YAML/JSON) for auditing
- All mappings: Source Format -> CIR -> Target Format

**Rationale:** Following Model-Driven Engineering principles, a Platform-Independent Model serves as the transformation hub, enabling consistent mapping rules, single point of loss annotation, and easier addition of new formats.

### IV. Transformation Fidelity & Loss Tracking

The system MUST prioritise TRANSPARENCY over FALSE EQUIVALENCE. Every transformation MUST produce a Fidelity Manifest documenting what can and cannot be preserved.

**Fidelity Levels:**
- LOSSLESS (100%): Perfect round-trip possible
- HIGH FIDELITY (90-99%): Minor losses; semantics preserved
- MEDIUM FIDELITY (70-89%): Approximation or extensions required
- LOW FIDELITY (50-69%): Core semantics preserved, representation different
- SEMANTIC ONLY (<50%): Only business intent preserved

**Non-negotiables:**
- System MUST warn when transformation falls below configured fidelity threshold
- Lossy mappings MUST include explanations and recommendations
- Unmappable constructs MUST be explicitly documented
- Fidelity policies MUST be configurable at organisation, project, and transformation levels

### V. Bidirectional Traceability

The system MUST maintain bidirectional traceability links between all artefacts. Each traceable element MUST have a stable identifier (e.g., REQ-001, MODEL-Customer, OP-GetCustomerById) that persists across transformations.

**Traceability Chain:**
- Requirements <-> CIR elements
- CIR elements <-> Generated specification constructs
- Specification constructs <-> Test cases
- Test cases <-> Collection entries

### VI. Standards Compliance

The system MUST generate specifications that strictly comply with official standards:
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- JSON Schema: https://json-schema.org/specification.html
- W3C XML Schema: https://www.w3.org/XML/Schema
- WSDL 1.1: https://www.w3.org/TR/wsdl | WSDL 2.0: https://www.w3.org/TR/wsdl20/
- AsyncAPI: https://www.asyncapi.com/docs/reference/specification/latest
- GraphQL: https://spec.graphql.org/
- OWASP API Security: https://owasp.org/www-project-api-security/

### VII. Security by Design (NON-NEGOTIABLE)

All generated specifications and proxies MUST embed security best practices. The system MUST protect against OWASP API Security Top 10.

**Required Security Controls:**
- Authentication schemes (OAuth 2.0, OpenID Connect, API keys, mTLS, SAML)
- Authorisation models (scope-based, RBAC hints, ABAC extensions)
- Data classification tags (PII, PHI, PCI, Confidential, Internal, Public)
- Rate limiting configurations
- Input validation for all parameters
- TLS 1.2+ for transit, encryption at rest indicators

**OWASP API Top 10 Coverage:**
- API1: Broken Object Level Authorisation - resource-level checks
- API2: Broken Authentication - strong schemes enforced
- API3: Broken Object Property Level Authorisation - sensitive property flags
- API4: Unrestricted Resource Consumption - rate limiting, pagination
- API5: Broken Function Level Authorisation - role-based operation access
- API6: Unrestricted Access to Sensitive Business Flows - flow protection
- API7: SSRF - URL parameter validation
- API8: Security Misconfiguration - secure defaults
- API9: Improper Inventory Management - version tracking, deprecation
- API10: Unsafe Consumption of APIs - external dependency documentation

**Prohibited:**
- Secrets or tokens in URLs
- HTTP Basic without TLS warning
- Missing authentication on sensitive endpoints

### VIII. RESTful Design Excellence

Generated OpenAPI specifications MUST follow industry best practices:

**Path Design:**
- Resource-oriented modelling (nouns, not verbs)
- Collections: `/resources`
- Items: `/resources/{id}`
- Sub-resources: `/resources/{id}/sub-resources`
- Actions: `/resources/{id}/actions/action-name`

**HTTP Semantics:**
- GET: retrieval (safe, idempotent)
- POST: creation (unsafe, non-idempotent)
- PUT: full replacement (unsafe, idempotent)
- PATCH: partial update (unsafe, non-idempotent)
- DELETE: removal (unsafe, idempotent)

**Parameter Usage:**
- Path: resource identifiers
- Query: filtering, sorting, pagination, sparse fieldsets
- Header: metadata, authentication, content negotiation
- Body: complex data for creation/update

**Additional Requirements:**
- Consistent naming conventions (configurable: camelCase, snake_case, kebab-case)
- Hypermedia links where appropriate (HATEOAS)
- Support for splitting large OpenAPI into per-resource documents

### IX. Comprehensive Documentation

The system MUST generate professional, human-readable documentation covering:
- Executive summary and API overview
- Authentication and authorisation guide
- Complete endpoint documentation with examples
- Data model documentation to deepest child level
- Sample cURL commands and request/response payloads
- Error responses with troubleshooting guidance
- Changelog and version history
- Glossary of terms

**Output Formats:** Word (.docx), PDF, HTML, Markdown, Confluence

**Template Support:**
- Microsoft Word templates (.dotx) with styles and themes
- Cover pages with customisable fields
- Corporate branding (logos, colours, fonts)
- Headers/footers with page numbers, dates, version info

### X. Testing Artefact Generation

The system MUST generate comprehensive test artefacts maintaining traceability to requirements.

**Test Coverage:**
- Happy path tests (valid requests, CRUD operations, pagination)
- Negative tests (missing params, invalid formats, out-of-range values)
- Edge case tests (boundary values, special characters, large payloads)
- Security tests (auth failures, authorisation failures, injection attempts)

**Output Formats:**
- Postman collections (v2.1) with environment variables, pre-request scripts, test scripts
- Insomnia exports
- BDD scenarios (Given/When/Then)
- Schemathesis, Dredd, Prism configurations

### XI. User Control & Overrides

When automation is uncertain, the system MUST present clear options with trade-offs and recommended defaults. Users MUST be able to:
- Override automated design choices (rename types, change HTTP methods, modify mappings)
- Lock elements from automatic refactoring (mark schemas as "frozen")
- Define custom mapping rules (project-specific type mappings, naming transformations)
- Save overrides as reusable patterns (organisation-wide rules, project templates)

**Content Classification:**
- GENERATED: Can be regenerated
- CUSTOMISED: Regeneration preserves customisations
- MANUAL: Protected from regeneration

### XII. Extensibility Architecture

The system MUST be designed for extensibility to additional formats via plugin-based architecture.

**Extension Principles:**
- New formats as separate modules
- Declarative mappings in configuration, not code
- Hot-reloadable without system restart
- Backward compatible with existing formats

**Format Status:**
- INCLUDED: OpenAPI, WSDL/XSD, JSON Schema, AsyncAPI, GraphQL
- SUPPORTED INPUT: RAML, API Blueprint
- PLANNED: gRPC/Protobuf, Apache Avro
- FUTURE: Apache Thrift, OData

**Any extension MUST respect core principles:** Text-first, Reversible with fidelity tracking, Traceable, Standards-aligned, Secure by design.

### XIII. Implementation & Deployment Principles

The system MUST be designed and implemented following modern cloud-native and API-first practices to ensure operational excellence, maintainability, and scalability.

**API-First Approach:**
- All core capabilities MUST be exposed via well-defined service APIs before user interfaces or integrations are built
- APIs serve as the contract for all system interactions

**Microservices Architecture:**
- Functionality MUST be decomposed into independently deployable services
- Each service MUST have clear bounded contexts and autonomous lifecycles
- Service contracts MUST be explicit and versioned

**RESTful by Default:**
- All externally exposed and internal service APIs MUST follow RESTful design principles by default
- Alternative styles (GraphQL, gRPC) require explicit justification
- Resource orientation, proper HTTP methods, and standard status codes are mandatory

**Cloud-Native Runtime:**
- The system MUST use containerised workloads (e.g., Docker)
- Deployment MUST be orchestrated (e.g., Kubernetes or compatible platform)
- Configuration MUST be externalised following twelve-factor app principles
- Environment parity MUST be maintained across dev, staging, and production

**CI/CD Pipeline Requirements:**
- All services and components MUST have end-to-end CI/CD pipelines
- Pipelines MUST include: automated build, test, security scanning, and deployment
- Both code and specifications MUST have traceable versioning

**Observability as First-Class Requirement:**
- Centralised logging MUST be implemented for all services
- Metrics collection and dashboards MUST be standard
- Distributed tracing MUST be enabled across service boundaries
- Health checks MUST be exposed by all services
- Graceful degradation and fault isolation MUST be designed into the architecture

**Technology Replaceability:**
- Implementation technologies (languages, frameworks, infrastructure) MUST be replaceable over time
- Changes in technology choices MUST NOT invalidate constitutional principles
- Abstractions MUST be used to isolate technology-specific concerns

## Canonical Intermediate Representation (CIR) Structure

The CIR MUST capture:

### Service Metadata
- Service name, version, description, contact information
- Base URLs, server configurations
- Authentication and authorisation schemes
- Terms of service, licensing

### Operations/Endpoints
- Operation identifier, summary, description
- HTTP method or operation type (for SOAP/event)
- Path with parameter placeholders
- Input parameters (path, query, header, cookie, body)
- Output responses with status codes
- Error definitions
- Deprecation status and sunset dates

### Data Models
- Type definitions (primitive, complex, composite)
- Properties with constraints (min/max, pattern, format)
- Cardinalities (required, optional, arrays with bounds)
- Inheritance and composition relationships
- Discriminators and polymorphism
- Enumerations with descriptions
- Default values and examples
- XML-specific: attributes, element ordering, namespaces
- JSON-specific: additionalProperties, patternProperties

### Security Definitions
- Authentication schemes
- Scopes and permissions
- Security requirements per operation

### Metadata Extensions
- Custom annotations preserving format-specific semantics
- Traceability identifiers linking to requirements
- Governance tags (owner, classification, lifecycle stage)

## Format-Specific Standards

### OpenAPI
- Support versions 2.0/Swagger, 3.0.x, 3.1.x
- Components reuse via $ref (schemas, responses, parameters, examples)
- Discriminator for polymorphism
- Callbacks for webhooks
- Links for expressing relationships between operations
- Server variables and multiple server definitions
- Extensions (x-*) for custom metadata preservation
- Support for large specifications (streaming/chunked processing)

### WSDL/XSD
- WSDL versions 1.1 and 2.0
- XSD versions 1.0 and 1.1 (including xs:assert assertions)
- Document/literal wrapped and RPC/literal styles
- Proper namespace handling
- Import/include for modular schemas
- Abstract types and substitution groups
- SOAP header to OpenAPI parameter mapping

### JSON Schema
- Support Draft-04 through Draft 2020-12
- Preserve XML semantics via x-xml-* extensions
- Annotate lossy transformations with x-transformation-loss
- Round-trip preservation extensions (x-original-format, x-original-construct)

### AsyncAPI
- Support versions 2.x and 3.x
- Schema reuse across OpenAPI and AsyncAPI
- Channel and message definitions with correlation IDs
- Protocol-specific bindings (Kafka, AMQP, MQTT, WebSocket)
- Mapping: OpenAPI callbacks -> AsyncAPI publish, long-polling -> subscribe

### GraphQL
- Object, Query, Mutation, Subscription types
- Input types for complex arguments
- Interface and Union types for polymorphism
- Custom scalars for domain-specific types
- Paradigm difference annotations (status codes, headers don't map cleanly)

## Governance Framework

### Reusable Patterns
The system MUST promote standard entities:
- Address, Person, Organisation, Money, Quantity, DateRange
- Pagination, Error, AuditInfo
- Standard response envelopes (Success, Error, Collection)
- Standard security schemes (OAuth2 flows, API key patterns, JWT validation)

### Versioning Strategy
Support for:
- URI versioning (/v1/, /v2/)
- Header versioning (Accept-Version)
- Query parameter versioning (?version=1)
- Media type versioning (application/vnd.api.v1+json)

### Deprecation Policy
- Sunset header requirements
- Migration documentation requirements
- Minimum deprecation notice period

### Quality Attributes
- SCALABILITY: Handle enterprise-scale specifications (millions of lines)
- EXPLAINABILITY: Link every output to its source with reasoning
- AUDIT TRAILS: Record all transformations with timestamps, support rollback
- ERROR HANDLING: Graceful degradation with actionable messages

## Amendment Procedure

1. Proposed amendments MUST be documented with rationale
2. Amendments require review and approval by project stakeholders
3. Version increments follow semantic versioning:
   - MAJOR: Backward incompatible principle changes or removals
   - MINOR: New principles or material expansions
   - PATCH: Clarifications, wording, and typo fixes
4. All dependent templates MUST be updated for consistency
5. Migration plan required for breaking changes

## Compliance Review

- All PRs MUST verify compliance with constitution principles
- Constitution Check in plan.md MUST pass before implementation
- Complexity additions MUST be justified against simplicity principle
- Security controls MUST be validated before deployment

**Version**: 1.1.0 | **Ratified**: 2025-12-08 | **Last Amended**: 2025-12-11

---

## Amendment History

### Amendment 1 (2025-12-11) – Feature 002 DSL Editor Principles
**Change Type**: MINOR (New sub-principle)
**Rationale**: Feature 002 (Requirements Grammar Authoring Studio) clarifications establish foundational editorial experience and architectural directives that require constitutional codification.
**Changes**:
- Added Principle I.A: **Interactive DSL Authoring Studio**
  - Specifies split-pane editor/preview UX (Swagger Editor parity)
  - Establishes real-time validation strategy (best-effort incremental parsing)
  - Defines MVP DSL scope: Service, Model, Operation, Error (Security Phase 2)
  - Mandates markdown-based syntax and plain-text storage
  - Requires cloud-native, microservices, open source architecture
  - Establishes observability and service mesh as first-class requirements
  - Documents bidirectional selection and context-aware autocomplete expectations

**Impact**: Provides constitutional authority for Feature 002 architecture and task decomposition. Aligns DSL editor UX and backend architecture with project principles before implementation.

**Dependent Files Updated**: None (constitution forms basis for all dependent specs and plans)
