#!/bin/bash
# Generate TypeScript types from OpenAPI spec

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

OPENAPI_URL="${OPENAPI_URL:-http://localhost:5001/openapi/v1.json}"
OUTPUT_FILE="$PROJECT_ROOT/frontend/src/types/api-generated.ts"

echo "Fetching OpenAPI spec from $OPENAPI_URL..."

# Fetch and save the OpenAPI spec
curl -s "$OPENAPI_URL" > "$SCRIPT_DIR/openapi.json"

if [ ! -s "$SCRIPT_DIR/openapi.json" ]; then
  echo "Error: Failed to fetch OpenAPI spec"
  exit 1
fi

echo "Generating TypeScript types..."

# Generate types using openapi-typescript
cd "$PROJECT_ROOT/frontend"
npx openapi-typescript "$SCRIPT_DIR/openapi.json" -o "$OUTPUT_FILE"

echo "Types generated at $OUTPUT_FILE"
echo "OpenAPI spec saved at $SCRIPT_DIR/openapi.json"
