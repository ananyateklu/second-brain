#!/bin/bash
# ============================================================================
# Second Brain Database Migration Script
# ============================================================================
# Applies database migrations to both Docker and Desktop PostgreSQL instances.
#
# Usage:
#   ./migrate.sh [options] [command]
#
# Commands:
#   status          - Show migration status for both databases
#   run             - Run pending migrations
#   run-all         - Run all migrations (fresh install)
#   script N        - Run specific script (e.g., script 13)
#   rollback N      - Run rollback script for migration N
#   init            - Initialize migration tracking for existing databases
#   diff            - Compare schemas between Docker and Desktop databases
#   sync-to-docker  - Copy missing indexes from Desktop to Docker
#   sync-to-desktop - Copy missing indexes from Docker to Desktop
#   copy-to-docker  - Copy ALL data from Desktop to Docker (overwrites!)
#   copy-to-desktop - Copy ALL data from Docker to Desktop (overwrites!)
#   backup          - Create pg_dump backup of database
#   stats           - Show database statistics (sizes, rows, indexes)
#   validate        - Verify required tables and columns exist
#   export-schema   - Export current schema to SQL file
#   test            - Quick connection test for both databases
#   seed            - Seed database with realistic test notes for RAG testing
#   unseed          - Remove all seeded test data (source='seed')
#
# Options:
#   --docker   - Target Docker database only (port 5432)
#   --desktop  - Target Desktop database only (port 5433)
#   --dry-run  - Show what would be run without executing
#   --force    - Skip confirmation prompts
#   --password - Docker password (or set POSTGRES_PASSWORD env var)
#   --user-id  - User ID for seed command (prompts if not provided)
#   --count N  - Number of notes to seed (default: 500)
#   --help     - Show this help message
# ============================================================================

set -e

# Get script directory (where this script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

# Export SCRIPT_DIR for use in modules
export SCRIPT_DIR

# Source all modules
source "${LIB_DIR}/config.sh"
source "${LIB_DIR}/utils.sh"
source "${LIB_DIR}/db-functions.sh"
source "${LIB_DIR}/migration-functions.sh"
source "${LIB_DIR}/schema-functions.sh"
source "${LIB_DIR}/seed-functions.sh"
source "${LIB_DIR}/data-copy-functions.sh"
source "${LIB_DIR}/commands.sh"

# ============================================================================
# Main - Argument Parsing and Command Routing
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            TARGET_DOCKER=true
            shift
            ;;
        --desktop)
            TARGET_DESKTOP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --password)
            shift
            if [[ $# -gt 0 ]]; then
                DOCKER_PASSWORD=$1
                shift
            else
                print_error "--password requires an argument"
                exit 1
            fi
            ;;
        --user-id)
            shift
            if [[ $# -gt 0 ]]; then
                SEED_USER_ID=$1
                shift
            else
                print_error "--user-id requires an argument"
                exit 1
            fi
            ;;
        --count)
            shift
            if [[ $# -gt 0 ]]; then
                SEED_COUNT=$1
                shift
            else
                print_error "--count requires an argument"
                exit 1
            fi
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        status|run|run-all|init|diff|sync-to-docker|sync-to-desktop|copy-to-docker|copy-to-desktop|backup|stats|validate|export-schema|test|seed|unseed)
            COMMAND=$1
            shift
            ;;
        rollback)
            COMMAND=$1
            shift
            if [[ $# -gt 0 ]]; then
                ROLLBACK_NUM=$1
                shift
            fi
            ;;
        script)
            COMMAND=$1
            shift
            if [[ $# -gt 0 ]]; then
                SCRIPT_NUM=$1
                shift
            fi
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If neither target specified, target both
if [ "$TARGET_DOCKER" = false ] && [ "$TARGET_DESKTOP" = false ]; then
    TARGET_DOCKER=false
    TARGET_DESKTOP=false
fi

# Execute command
case $COMMAND in
    status)
        cmd_status
        ;;
    run)
        cmd_run
        ;;
    run-all)
        cmd_run_all
        ;;
    script)
        cmd_script "$SCRIPT_NUM"
        ;;
    init)
        cmd_init
        ;;
    diff)
        cmd_diff
        ;;
    sync-to-docker)
        cmd_sync_to_docker
        ;;
    sync-to-desktop)
        cmd_sync_to_desktop
        ;;
    copy-to-docker)
        cmd_copy_to_docker
        ;;
    copy-to-desktop)
        cmd_copy_to_desktop
        ;;
    backup)
        cmd_backup
        ;;
    rollback)
        cmd_rollback "$ROLLBACK_NUM"
        ;;
    stats)
        cmd_stats
        ;;
    validate)
        cmd_validate
        ;;
    export-schema)
        cmd_export_schema
        ;;
    test)
        cmd_test
        ;;
    seed)
        cmd_seed
        ;;
    unseed)
        cmd_unseed
        ;;
    "")
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
