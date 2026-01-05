# API Contract Testing

This directory contains the OpenAPI specification and tooling for API contract testing between the frontend and backend.

## Overview

We use [openapi-typescript](https://github.com/drwpow/openapi-typescript) to generate TypeScript types from the backend's OpenAPI specification. This ensures type safety and catches breaking API changes early.

## Files

- `openapi.json` - The OpenAPI specification exported from the backend
- `generate-types.sh` - Script to regenerate TypeScript types

## Workflow

### 1. Export OpenAPI Spec

The backend exposes its OpenAPI spec at `/openapi/v1.json`. Run the generate script when the API changes:

```bash
# Make sure backend is running
./contracts/generate-types.sh
```

### 2. Generated Types

Types are generated to `frontend/src/types/api-generated.ts` and can be imported:

```typescript
import type { paths, components } from '@/types/api-generated';

// Use path types for API calls
type NotesResponse = paths['/api/notes']['get']['responses']['200']['content']['application/json'];

// Use component types for entities
type Note = components['schemas']['NoteResponse'];
```

### 3. CI Integration

The CI pipeline can check for spec drift:

```bash
# Generate fresh types
./contracts/generate-types.sh

# Check if types changed
git diff --exit-code frontend/src/types/api-generated.ts
```

If the diff check fails, it means the API changed without updating the committed types.

## Updating the Contract

1. Make backend API changes
2. Run `./contracts/generate-types.sh`
3. Update frontend code to use new types
4. Commit both `openapi.json` and `api-generated.ts`

## Best Practices

1. **Version the spec** - Commit `openapi.json` to track API evolution
2. **Generate in CI** - Catch drift between spec and types
3. **Use generated types** - Import from `api-generated.ts` for API calls
4. **Validate responses** - Consider runtime validation with Zod schemas
