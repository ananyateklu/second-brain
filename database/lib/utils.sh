#!/bin/bash
# ============================================================================
# Utility Functions Module
# ============================================================================
# Helper functions for output formatting and help text

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

show_help() {
    cat << EOF
Second Brain Database Migration Script

Usage: ./migrate.sh [options] [command]

Commands:
  status          Show migration status for all target databases
  run             Run pending migrations on target databases
  run-all         Run all migrations (for fresh install)
  script N        Run a specific migration script (e.g., script 13)
  rollback N      Run rollback script for migration N (e.g., rollback 13)
  init            Initialize migration tracking for existing databases
  diff            Compare schemas between Docker and Desktop databases
  sync-to-docker  Copy missing indexes from Desktop → Docker
  sync-to-desktop Copy missing indexes from Docker → Desktop
  copy-to-docker  Copy ALL data from Desktop → Docker (overwrites target!)
  copy-to-desktop Copy ALL data from Docker → Desktop (overwrites target!)
  backup          Create pg_dump backup of database(s)
  stats           Show database statistics (table sizes, row counts)
  validate        Verify all required tables and columns exist
  export-schema   Export current schema to SQL file
  test            Quick connection test for both databases
  seed            Seed database with realistic test notes for RAG/Agent testing
  unseed          Remove all seeded test data (notes where source='seed')

Options:
  --docker          Target Docker database only (port $DOCKER_PORT, user $DOCKER_USER)
  --desktop         Target Desktop database only (port $DESKTOP_PORT, user $DESKTOP_USER)
  --password PASS   Docker database password (or set POSTGRES_PASSWORD env var)
  --user-id ID      User ID for seed command (prompts interactively if not provided)
  --count N         Number of notes to seed (default: $SEED_COUNT)
  --dry-run         Show what would be run without executing
  --force           Skip confirmation prompts
  --help            Show this help message

Environment Variables:
  POSTGRES_PASSWORD   Docker database password (auto-loaded from .env if present)

Examples:
  ./migrate.sh status                      # Show status of both databases
  ./migrate.sh run                         # Run pending migrations on both
  ./migrate.sh --desktop run               # Run pending on desktop only
  ./migrate.sh --docker script 13          # Run script 13 on Docker only
  ./migrate.sh --force run-all             # Fresh install without prompts
  ./migrate.sh --desktop init               # Initialize tracking on existing desktop DB
  ./migrate.sh diff                         # Compare schemas between databases
  ./migrate.sh sync-to-docker               # Copy Desktop indexes to Docker
  ./migrate.sh sync-to-desktop              # Copy Docker indexes to Desktop
  ./migrate.sh copy-to-docker               # Copy ALL Desktop data to Docker
  ./migrate.sh copy-to-desktop              # Copy ALL Docker data to Desktop
  ./migrate.sh backup                       # Backup both databases
  ./migrate.sh --docker backup              # Backup Docker only
  ./migrate.sh rollback 13                  # Run rollback for migration 13
  ./migrate.sh stats                        # Show database statistics
  ./migrate.sh validate                     # Verify schema integrity
  ./migrate.sh export-schema                # Export schemas to SQL files
  ./migrate.sh test                         # Quick connection test
  POSTGRES_PASSWORD=mypass ./migrate.sh status  # Use custom Docker password

  # Seed commands for stress testing RAG/Agent functionality
  ./migrate.sh --desktop seed               # Seed 500 notes (prompts for user)
  ./migrate.sh --docker seed --user-id abc123 --count 100  # Seed 100 notes for user
  ./migrate.sh --desktop unseed             # Remove all seeded data
  ./migrate.sh --desktop seed --dry-run     # Preview seed operation

Database Targets:
  Docker:   localhost:$DOCKER_PORT (user: $DOCKER_USER, password from env)
  Desktop:  localhost:$DESKTOP_PORT (user: $DESKTOP_USER, no password)
EOF
}
