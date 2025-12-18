# CSV Schema Specifications for Form-Based OpenAPI Builder

This directory contains CSV template schemas for documenting APIs without learning YAML/OpenAPI syntax.

## Directory Structure

```
csv-schemas/
├── README.md                    # This file
├── oas-3.0.x/                   # OpenAPI 3.0.x templates (15 sheets)
│   ├── 01-api-info.csv
│   ├── 02-servers.csv
│   ├── 03-tags.csv
│   ├── 04-models.csv
│   ├── 05-model-fields.csv
│   ├── 06-operations.csv
│   ├── 07-parameters.csv
│   ├── 08-request-bodies.csv
│   ├── 09-responses.csv
│   ├── 10-response-headers.csv
│   ├── 11-security-schemes.csv
│   ├── 12-security-requirements.csv
│   ├── 13-examples.csv
│   ├── 14-links.csv
│   └── 15-callbacks.csv
└── oas-3.1.x/                   # OpenAPI 3.1.x templates (17 sheets)
    ├── 01-api-info.csv
    ├── 02-servers.csv
    ├── 03-tags.csv
    ├── 04-models.csv
    ├── 05-model-fields.csv
    ├── 06-operations.csv
    ├── 07-parameters.csv
    ├── 08-request-bodies.csv
    ├── 09-responses.csv
    ├── 10-response-headers.csv
    ├── 11-security-schemes.csv
    ├── 12-security-requirements.csv
    ├── 13-examples.csv
    ├── 14-links.csv
    ├── 15-callbacks.csv
    ├── 16-webhooks.csv          # NEW in 3.1.x
    └── 17-path-items.csv        # NEW in 3.1.x
```

## CSV Format Conventions

1. **Header Row**: First row contains column names (snake_case)
2. **Data Types**: Indicated in schema, enforced by UI
3. **Required Fields**: Marked with `*` suffix in header
4. **References**: Use `@model:ModelName` or `@schema:SchemaName` syntax
5. **Arrays**: Use semicolon-separated values (e.g., `tag1;tag2;tag3`)
6. **Nested Objects**: Use dot notation (e.g., `contact.email`)
7. **Empty Values**: Leave cell empty (no NULL keyword)
8. **Escaping**: Standard CSV escaping (double quotes for values containing commas)

## Version Differences Summary

| Feature | OAS 3.0.x | OAS 3.1.x |
|---------|-----------|-----------|
| Nullable | `nullable: true` | `type: ["string", "null"]` |
| Exclusive bounds | Boolean | Number |
| Webhooks | Not supported | Top-level object |
| Path Items | Inline only | Reusable in components |
| Security | 4 types | 5 types (+ mutualTLS) |
| License | name + url | + identifier (SPDX) |
| JSON Schema | Draft-04 subset | Draft 2020-12 |

## Usage

1. Fill in the CSV templates with your API documentation
2. Import into the Form-Based API Builder UI
3. Generate OpenAPI YAML/JSON automatically
4. Export to Swagger UI, Redoc, or other tools
