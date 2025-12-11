# API Contracts: Core Framework & Professional Home Page

**Feature**: 001-core-framework-homepage
**Version**: 0.1.0
**Date**: 2025-12-10

## Overview

This directory contains the API contracts for the Core Framework feature. The contracts are defined using OpenAPI 3.1 specification and serve as the single source of truth for API behavior.

## Files

| File | Description |
|------|-------------|
| `openapi.yaml` | OpenAPI 3.1 specification |

## Endpoints Summary

### Health Endpoints (Public)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/health` | Health check status | No |
| GET | `/api/v1/health/ready` | Readiness probe | No |

### Module Endpoints (Authenticated)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/modules` | List all modules | Yes |
| GET | `/api/v1/modules/{moduleId}` | Get module by ID | Yes |

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/login` | Mock login | No |
| POST | `/api/v1/auth/logout` | Logout | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |

## Authentication

For development, use the mock bearer token:
```
Authorization: Bearer mock-token-12345
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

## Validation

To validate the OpenAPI spec:

```bash
# Using spectral (recommended)
npx @stoplight/spectral-cli lint contracts/openapi.yaml

# Using swagger-cli
npx swagger-cli validate contracts/openapi.yaml
```

## Code Generation

Generate TypeScript types from the spec:

```bash
# Using openapi-typescript
npx openapi-typescript contracts/openapi.yaml -o frontend/src/types/api.generated.ts
```

Generate Python models:

```bash
# Using datamodel-code-generator
datamodel-codegen --input contracts/openapi.yaml --output backend/src/models/api_generated.py
```

## Requirements Traceability

| Endpoint | Requirements |
|----------|--------------|
| `/api/v1/health` | FR-027, SC-010 |
| `/api/v1/health/ready` | FR-027 |
| `/api/v1/modules` | FR-016, FR-017, FR-019 |
| `/api/v1/modules/{id}` | FR-016, FR-018 |
| `/api/v1/auth/login` | FR-013 |
| `/api/v1/auth/logout` | FR-013 |
| `/api/v1/auth/me` | FR-012, FR-014 |
