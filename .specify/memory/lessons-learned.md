# Lessons Learned

This document captures mistakes made during development and the mitigations put in place to prevent them from recurring. Each lesson becomes a guardrail encoded into skills, checklists, or CI/CD pipelines.

## Version Control

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial creation with Docker build lessons |

---

## L001: Stale Build Artifacts in Docker Containers

**Date Discovered:** 2025-12-25
**Severity:** HIGH
**Category:** Deployment / Docker / CI/CD

### What Happened

When creating the Docker Compose deployment, an older version of the frontend build (`dist/`) was shipped instead of the current source code. The API Builder feature (added Dec 24) was missing because the `dist/` directory contained a build from Dec 13.

### Root Cause Analysis

1. **Stale `dist/` directory**: Build artifacts were 11 days older than source code
2. **No CI/CD pipeline**: Manual builds are error-prone and don't enforce fresh builds
3. **Docker layer caching**: Cached layers were not properly invalidated when source changed
4. **Two docker-compose files**: Confusion between `/docker/docker-compose.yml` and root `/docker-compose.yaml`
5. **No pre-deployment verification**: No automated checks that built artifacts match source

### Evidence

```
Frontend dist created: Dec 13 19:09 UTC
API Builder added:     Dec 24 08:41 UTC
Docker Compose docs:   Dec 24 12:45 UTC
Gap: 11 days of missing changes
```

### Mitigations Implemented

#### 1. Pre-Deployment Checklist Skill (`/sp.deploy-check`)
- Verifies build artifacts are newer than source files
- Validates Docker builds include latest changes
- Checks for stale cached layers

#### 2. CI/CD Pipeline (`.github/workflows/docker-build.yml`)
- Forces fresh builds on every push
- Uses `--no-cache` for Docker builds in CI
- Runs automated tests against containerized builds

#### 3. Constitution Amendment (Principle XIII)
- Added requirement for CI/CD pipelines
- Mandated build artifact verification
- Required environment parity validation

#### 4. .dockerignore Updates
- Ensures `dist/` is never copied from host (forces rebuild inside container)
- Excludes `.git/`, `node_modules/` to reduce build context

### Prevention Checklist

Before ANY deployment:

- [ ] Delete local `dist/` directories before Docker build
- [ ] Run `docker compose build --no-cache` for production
- [ ] Verify the deployed UI includes the latest features
- [ ] Check build timestamps match source modification times
- [ ] Run smoke tests against containerized build

### Related Files

- `/docker-compose.yaml` - Primary compose file
- `/frontend/Dockerfile` - Frontend build configuration
- `/.github/workflows/docker-build.yml` - CI/CD pipeline
- `/sp.deploy-check` - Pre-deployment verification skill

---

## L002: [Template for Future Lessons]

**Date Discovered:** YYYY-MM-DD
**Severity:** LOW | MEDIUM | HIGH | CRITICAL
**Category:** Category

### What Happened

[Description of the issue]

### Root Cause Analysis

1. [Root cause 1]
2. [Root cause 2]

### Evidence

[Evidence of the issue]

### Mitigations Implemented

[List of mitigations]

### Prevention Checklist

- [ ] Checklist item 1
- [ ] Checklist item 2

### Related Files

- [File 1]
- [File 2]

---

## Lessons Index

| ID | Title | Severity | Category | Date |
|----|-------|----------|----------|------|
| L001 | Stale Build Artifacts in Docker | HIGH | Deployment/Docker | 2025-12-25 |

---

## Usage

When encountering a new issue that could recur:

1. Add a new lesson section following the template
2. Update the lessons index
3. Create/update corresponding skills, checklists, or CI/CD
4. Reference this lesson in the mitigation artifacts
