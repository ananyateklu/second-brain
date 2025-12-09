#!/bin/bash
# ============================================================================
# Configuration Module
# ============================================================================
# Database connection settings and environment variable loading

# Script directory (where SQL files are located)
# Set by main migrate.sh script before sourcing this module
if [ -z "$SCRIPT_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

# Project root directory (parent of database folder)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env file if it exists and POSTGRES_PASSWORD is not already set
LOADED_FROM_ENV=false
if [ -z "$POSTGRES_PASSWORD" ] && [ -f "$PROJECT_ROOT/.env" ]; then
    # Extract POSTGRES_PASSWORD from .env file
    ENV_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$ENV_PASSWORD" ]; then
        export POSTGRES_PASSWORD="$ENV_PASSWORD"
        LOADED_FROM_ENV=true
    fi
fi

# Configuration (after loading .env)
DOCKER_PORT=5432
DOCKER_USER=postgres
DOCKER_HOST=localhost
DOCKER_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DESKTOP_PORT=5433
DESKTOP_USER=secondbrain
DESKTOP_HOST=localhost
DESKTOP_PASSWORD=""  # Desktop uses trust authentication
DATABASE=secondbrain

# Default options
TARGET_DOCKER=false
TARGET_DESKTOP=false
DRY_RUN=false
FORCE=false
COMMAND=""
SCRIPT_NUM=""
ROLLBACK_NUM=""

# Seed command options
SEED_USER_ID=""
SEED_COUNT=500
