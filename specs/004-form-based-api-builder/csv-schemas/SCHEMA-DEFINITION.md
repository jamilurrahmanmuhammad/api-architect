# CSV Schema Definition Guide

This document defines the field types, UI controls, and validation rules for the Form-Based OpenAPI Builder CSV templates.

## Field Naming Conventions

| Convention | Meaning | Example |
|------------|---------|---------|
| `field_name*` | Required field (asterisk suffix) | `title*` |
| `field_name` | Optional field | `description` |
| `snake_case` | All field names use snake_case | `request_body_ref` |

## Data Types

### Primitive Types

| Type | Description | CSV Representation |
|------|-------------|--------------------|
| `string` | Text value | Plain text |
| `integer` | Whole number | `123` |
| `number` | Decimal number | `123.45` |
| `boolean` | True/false | `true` or `false` |

### Complex Types

| Type | Description | CSV Representation |
|------|-------------|--------------------|
| `array` | List of values | Semicolon-separated: `val1;val2;val3` |
| `object` | Nested object | JSON string: `{"key": "value"}` |
| `reference` | Model reference | `@model:ModelName` |
| `schema_reference` | Schema reference | `@schema:SchemaName` |

### Special Types

| Type | Description | Example |
|------|-------------|---------|
| `type_array` | OAS 3.1 type array | `["string", "null"]` or `string;null` |
| `examples` | Array of examples | `["val1", "val2"]` |
| `enum` | Enumeration | `available;pending;sold` |
| `scopes` | OAuth2 scopes | `read=Read access;write=Write access` |

## UI Control Types

| Control | Description | Use Case |
|---------|-------------|----------|
| `text` | Single-line input | Short strings |
| `textarea` | Multi-line input | Descriptions, markdown |
| `number` | Numeric input | Integers, decimals |
| `select` | Dropdown selection | Enums, fixed options |
| `multiselect` | Multiple selection | Tags, scopes |
| `checkbox` | Boolean toggle | Flags |
| `url` | URL input with validation | URLs |
| `email` | Email input with validation | Emails |
| `json` | JSON editor | Complex objects |
| `code` | Code editor | Patterns, examples |
| `reference` | Model picker | Schema refs |

## Validation Rules

### String Validations

| Rule | Syntax | Description |
|------|--------|-------------|
| `min:N` | `min:1` | Minimum length |
| `max:N` | `max:100` | Maximum length |
| `pattern:TYPE` | `pattern:url` | Regex pattern |

### Number Validations

| Rule | Syntax | Description |
|------|--------|-------------|
| `min:N` | `min:0` | Minimum value |
| `max:N` | `max:100` | Maximum value |
| `step:N` | `step:1` | Increment step |

### Pattern Types

| Pattern | Description |
|---------|-------------|
| `url` | Valid URL |
| `email` | Valid email |
| `semver` | Semantic version |
| `spdx_licenses` | SPDX license identifier |
| `path` | OAS path pattern |
| `http_method` | HTTP method |
| `status_code` | HTTP status code |

## Reference Syntax

### Model References

```
@model:Pet           -> $ref: '#/components/schemas/Pet'
@model:Category      -> $ref: '#/components/schemas/Category'
```

### Schema References

```
@schema:Pet          -> $ref: '#/components/schemas/Pet'
@header:X-Rate-Limit -> $ref: '#/components/headers/X-Rate-Limit'
@example:pet_dog     -> $ref: '#/components/examples/pet_dog'
@link:GetPetById     -> $ref: '#/components/links/GetPetById'
```

### Runtime Expressions (for Links/Callbacks)

```
$response.body#/id        -> Response body field
$request.body#/callback   -> Request body field
$request.query.param      -> Query parameter
$request.header.X-Header  -> Request header
$url                      -> Request URL
$method                   -> HTTP method
```

## Sheet-Specific Field Definitions

### 01-api-info.csv

| Field | Type | UI Control | Validation | OAS Path |
|-------|------|------------|------------|----------|
| `title*` | string | text | min:1 max:100 | `info.title` |
| `version*` | string | text | pattern:semver | `info.version` |
| `summary` | string | text | max:200 | `info.summary` (3.1 only) |
| `description` | string | textarea | max:5000 | `info.description` |
| `terms_of_service` | string | url | pattern:url | `info.termsOfService` |
| `contact_name` | string | text | max:100 | `info.contact.name` |
| `contact_email` | string | email | pattern:email | `info.contact.email` |
| `contact_url` | string | url | pattern:url | `info.contact.url` |
| `license_name` | string | text | max:100 | `info.license.name` |
| `license_identifier` | string | select | spdx_licenses | `info.license.identifier` (3.1 only) |
| `license_url` | string | url | pattern:url | `info.license.url` |

### 04-models.csv

| Field | Type | UI Control | OAS 3.0 | OAS 3.1 |
|-------|------|------------|---------|---------|
| `model_name*` | string | text | Yes | Yes |
| `type` | string | select | Yes | Yes |
| `type_array` | array | multiselect | No | Yes (e.g., `["string", "null"]`) |
| `nullable` | boolean | checkbox | Yes | No (use type_array) |
| `discriminator_property` | string | text | Yes | Yes |
| `exclusive_minimum` | boolean | checkbox | Yes (boolean) | No (use number) |
| `exclusive_maximum` | boolean | checkbox | Yes (boolean) | No (use number) |

### 05-model-fields.csv

| Field | Type | UI Control | Description |
|-------|------|------------|-------------|
| `model_name*` | string | reference | Parent model |
| `field_name*` | string | text | Property name |
| `type*` | string | select | Data type |
| `type_array` | array | multiselect | OAS 3.1 type array |
| `format` | string | select | Format hint |
| `description` | string | textarea | Field description |
| `required` | boolean | checkbox | Is required |
| `example` | string | code | OAS 3.0 example |
| `examples` | array | json | OAS 3.1 examples array |
| `enum` | array | multiselect | Allowed values |
| `minimum` | number | number | Min value |
| `maximum` | number | number | Max value |
| `exclusive_minimum` | boolean/number | number | 3.0: boolean, 3.1: number |
| `exclusive_maximum` | boolean/number | number | 3.0: boolean, 3.1: number |
| `ref_model` | reference | reference | Model reference |

### 11-security-schemes.csv

| Field | Type | UI Control | OAS 3.0 | OAS 3.1 |
|-------|------|------------|---------|---------|
| `type*` | string | select | apiKey, http, oauth2, openIdConnect | + mutualTLS |
| `api_key_name` | string | text | For apiKey type | Same |
| `api_key_in` | string | select | query, header, cookie | Same |
| `http_scheme` | string | select | bearer, basic, etc. | Same |
| `oauth2_flow_type` | string | select | implicit, password, clientCredentials, authorizationCode | Same |
| `oauth2_scopes` | string | text | scope=desc;scope2=desc2 | Same |
| `openid_connect_url` | string | url | OpenID Connect Discovery URL | Same |

### 16-webhooks.csv (OAS 3.1 Only)

| Field | Type | UI Control | Description |
|-------|------|------------|-------------|
| `webhook_name*` | string | text | Webhook identifier |
| `method*` | string | select | HTTP method (usually POST) |
| `summary` | string | text | Short description |
| `description` | string | textarea | Detailed description |
| `request_body_ref` | reference | reference | Request body schema |
| `request_body_required` | boolean | checkbox | Is body required |
| `request_content_type` | string | select | Content type |
| `response_status*` | string | select | Expected response status |
| `response_description` | string | text | Response description |
| `tags` | array | multiselect | Associated tags |

### 17-path-items.csv (OAS 3.1 Only)

| Field | Type | UI Control | Description |
|-------|------|------------|-------------|
| `path_item_name*` | string | text | Reusable path item name |
| `summary` | string | text | Path summary |
| `description` | string | textarea | Path description |
| `*_operation_id` | string | text | Operation ID for method |
| `*_summary` | string | text | Operation summary |
| `*_description` | string | textarea | Operation description |
| `parameters` | array | multiselect | Shared parameters |
| `servers` | array | multiselect | Path-specific servers |

## Version Differences Summary

### Removed in OAS 3.1

| Feature | OAS 3.0 | OAS 3.1 Replacement |
|---------|---------|---------------------|
| `nullable` | `nullable: true` | `type: ["string", "null"]` |
| `exclusiveMinimum` (bool) | `exclusiveMinimum: true` | `exclusiveMinimum: 5` (number) |
| `exclusiveMaximum` (bool) | `exclusiveMaximum: true` | `exclusiveMaximum: 10` (number) |

### Added in OAS 3.1

| Feature | Description |
|---------|-------------|
| `info.summary` | Short API summary |
| `info.license.identifier` | SPDX license ID |
| `mutualTLS` security | Mutual TLS auth type |
| `webhooks` | Top-level webhook definitions |
| `components.pathItems` | Reusable path items |
| `examples` array | JSON Schema 2020-12 style |

## Import/Export Workflow

```
┌─────────────────┐
│   User fills    │
│   CSV sheets    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  CSV Importer   │
│  validates &    │
│  parses data    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Form-Based UI  │
│  for editing    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ OpenAPI Generator│
│ produces YAML/  │
│ JSON output     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Export to      │
│  Swagger/Redoc  │
└─────────────────┘
```
