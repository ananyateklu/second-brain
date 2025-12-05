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
#   backup          - Create pg_dump backup of database
#   stats           - Show database statistics (sizes, rows, indexes)
#   validate        - Verify required tables and columns exist
#   export-schema   - Export current schema to SQL file
#   test            - Quick connection test for both databases
#
# Options:
#   --docker   - Target Docker database only (port 5432)
#   --desktop  - Target Desktop database only (port 5433)
#   --dry-run  - Show what would be run without executing
#   --force    - Skip confirmation prompts
#   --password - Docker password (or set POSTGRES_PASSWORD env var)
#   --help     - Show this help message
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory (where SQL files are located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# ============================================================================
# Helper Functions
# ============================================================================

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
  backup          Create pg_dump backup of database(s)
  stats           Show database statistics (table sizes, row counts)
  validate        Verify all required tables and columns exist
  export-schema   Export current schema to SQL file
  test            Quick connection test for both databases

Options:
  --docker          Target Docker database only (port $DOCKER_PORT, user $DOCKER_USER)
  --desktop         Target Desktop database only (port $DESKTOP_PORT, user $DESKTOP_USER)
  --password PASS   Docker database password (or set POSTGRES_PASSWORD env var)
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
  ./migrate.sh --desktop init              # Initialize tracking on existing desktop DB
  ./migrate.sh diff                        # Compare schemas between databases
  ./migrate.sh sync-to-docker              # Copy Desktop indexes to Docker
  ./migrate.sh sync-to-desktop             # Copy Docker indexes to Desktop
  ./migrate.sh backup                      # Backup both databases
  ./migrate.sh --docker backup             # Backup Docker only
  ./migrate.sh rollback 13                 # Run rollback for migration 13
  ./migrate.sh stats                       # Show database statistics
  ./migrate.sh validate                    # Verify schema integrity
  ./migrate.sh export-schema               # Export schemas to SQL files
  ./migrate.sh test                        # Quick connection test
  POSTGRES_PASSWORD=mypass ./migrate.sh status  # Use custom Docker password

Database Targets:
  Docker:   localhost:$DOCKER_PORT (user: $DOCKER_USER, password from env)
  Desktop:  localhost:$DESKTOP_PORT (user: $DESKTOP_USER, no password)
EOF
}

# ============================================================================
# Database Functions
# ============================================================================

# Check if database is reachable
check_connection() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    if pg_isready -h "$host" -p "$port" -U "$user" -d "$DATABASE" > /dev/null 2>&1; then
        unset PGPASSWORD
        return 0
    else
        unset PGPASSWORD
        return 1
    fi
}

# Execute SQL and return result
run_sql() {
    local port=$1
    local user=$2
    local host=$3
    local sql=$4
    local password=$5
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    local result
    result=$(psql -h "$host" -p "$port" -U "$user" -d "$DATABASE" -t -A -c "$sql" 2>/dev/null)
    local exit_code=$?
    
    unset PGPASSWORD
    echo "$result"
    return $exit_code
}

# Execute SQL file
run_sql_file() {
    local port=$1
    local user=$2
    local host=$3
    local file=$4
    local password=$5
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    local result
    result=$(psql -h "$host" -p "$port" -U "$user" -d "$DATABASE" -f "$file" 2>&1)
    local exit_code=$?
    
    unset PGPASSWORD
    echo "$result"
    return $exit_code
}

# Ensure schema_migrations table exists
ensure_migrations_table() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(20) PRIMARY KEY,
            script_name VARCHAR(100) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    " "$password" > /dev/null 2>&1
}

# Get list of applied migrations
get_applied_migrations() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    ensure_migrations_table "$port" "$user" "$host" "$password"
    run_sql "$port" "$user" "$host" "SELECT version FROM schema_migrations ORDER BY version;" "$password"
}

# Check if specific migration is applied
is_migration_applied() {
    local port=$1
    local user=$2
    local host=$3
    local version=$4
    local password=$5
    
    local result=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM schema_migrations WHERE version = '$version';" "$password")
    [ "$result" = "1" ]
}

# Record migration as applied
record_migration() {
    local port=$1
    local user=$2
    local host=$3
    local version=$4
    local script_name=$5
    local password=$6
    
    run_sql "$port" "$user" "$host" "
        INSERT INTO schema_migrations (version, script_name) 
        VALUES ('$version', '$script_name')
        ON CONFLICT (version) DO NOTHING;
    " "$password" > /dev/null 2>&1
}

# Get all migration scripts in order
get_migration_scripts() {
    # Find all numbered SQL files (NN_*.sql pattern, excluding rollback scripts)
    find "$SCRIPT_DIR" -maxdepth 1 -name '[0-9][0-9]_*.sql' ! -name '*_rollback.sql' | sort
}

# Extract version from script filename
get_version_from_script() {
    local script=$1
    basename "$script" | sed 's/^\([0-9][0-9]\)_.*/\1/'
}

# ============================================================================
# Migration Functions
# ============================================================================

# Run a single migration on a database
run_migration() {
    local port=$1
    local user=$2
    local host=$3
    local script=$4
    local target_name=$5
    local password=$6
    
    local version=$(get_version_from_script "$script")
    local script_name=$(basename "$script")
    
    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY-RUN] Would run $script_name on $target_name"
        return 0
    fi
    
    print_info "Running $script_name on $target_name..."
    
    local output
    if output=$(run_sql_file "$port" "$user" "$host" "$script" "$password" 2>&1); then
        record_migration "$port" "$user" "$host" "$version" "$script_name" "$password"
        print_success "$script_name applied successfully"
        return 0
    else
        print_error "Failed to apply $script_name"
        echo "$output" | head -20
        return 1
    fi
}

# Show status for a single database
show_db_status() {
    local port=$1
    local user=$2
    local host=$3
    local target_name=$4
    local password=$5
    
    echo ""
    echo -e "${BLUE}Database: $target_name (port $port, user $user)${NC}"
    echo "----------------------------------------"
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to database"
        return 1
    fi
    
    print_success "Connected"
    
    # Get PostgreSQL version
    local pg_version=$(run_sql "$port" "$user" "$host" "SELECT version();" "$password" | head -1)
    echo "  Version: $(echo "$pg_version" | cut -d' ' -f1-2)"
    
    # Get applied migrations
    ensure_migrations_table "$port" "$user" "$host" "$password"
    local applied=$(get_applied_migrations "$port" "$user" "$host" "$password")
    local applied_count=0
    if [ -n "$applied" ]; then
        applied_count=$(echo "$applied" | grep -c '^[0-9]' 2>/dev/null || echo "0")
    fi
    
    echo ""
    echo "  Applied Migrations: $applied_count"
    
    # Show pending migrations
    local pending_count=0
    local pending_list=""
    
    for script in $(get_migration_scripts); do
        local version=$(get_version_from_script "$script")
        local script_name=$(basename "$script")
        
        if ! is_migration_applied "$port" "$user" "$host" "$version" "$password"; then
            pending_count=$((pending_count + 1))
            pending_list="$pending_list    - $script_name\n"
        fi
    done
    
    echo "  Pending Migrations: $pending_count"
    
    if [ $pending_count -gt 0 ]; then
        echo ""
        echo "  Pending:"
        echo -e "$pending_list"
    fi
    
    return 0
}

# Run pending migrations on a single database
run_pending_migrations() {
    local port=$1
    local user=$2
    local host=$3
    local target_name=$4
    local password=$5
    
    echo ""
    print_info "Processing $target_name..."
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name - skipping"
        return 1
    fi
    
    ensure_migrations_table "$port" "$user" "$host" "$password"
    
    local pending_count=0
    local success_count=0
    local failed_count=0
    
    for script in $(get_migration_scripts); do
        local version=$(get_version_from_script "$script")
        
        if ! is_migration_applied "$port" "$user" "$host" "$version" "$password"; then
            pending_count=$((pending_count + 1))
            
            if run_migration "$port" "$user" "$host" "$script" "$target_name" "$password"; then
                success_count=$((success_count + 1))
            else
                failed_count=$((failed_count + 1))
                if [ "$FORCE" != true ]; then
                    print_error "Stopping due to error (use --force to continue on errors)"
                    break
                fi
            fi
        fi
    done
    
    echo ""
    if [ $pending_count -eq 0 ]; then
        print_success "$target_name is up to date"
    else
        echo "  Results: $success_count/$pending_count migrations applied"
        if [ $failed_count -gt 0 ]; then
            print_error "$failed_count migrations failed"
            return 1
        fi
    fi
    
    return 0
}

# Run all migrations (fresh install)
run_all_migrations() {
    local port=$1
    local user=$2
    local host=$3
    local target_name=$4
    local password=$5
    
    echo ""
    print_info "Running all migrations on $target_name..."
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name - skipping"
        return 1
    fi
    
    ensure_migrations_table "$port" "$user" "$host" "$password"
    
    local total_count=0
    local success_count=0
    local failed_count=0
    
    for script in $(get_migration_scripts); do
        total_count=$((total_count + 1))
        
        if run_migration "$port" "$user" "$host" "$script" "$target_name" "$password"; then
            success_count=$((success_count + 1))
        else
            failed_count=$((failed_count + 1))
            if [ "$FORCE" != true ]; then
                print_error "Stopping due to error (use --force to continue)"
                break
            fi
        fi
    done
    
    echo ""
    echo "  Results: $success_count/$total_count migrations applied"
    if [ $failed_count -gt 0 ]; then
        print_error "$failed_count migrations failed"
        return 1
    fi
    
    return 0
}

# Run specific script by number
run_specific_script() {
    local port=$1
    local user=$2
    local host=$3
    local target_name=$4
    local script_num=$5
    local password=$6
    
    # Pad script number to 2 digits
    local padded_num=$(printf "%02d" "$script_num")
    
    # Find the script
    local script=$(find "$SCRIPT_DIR" -maxdepth 1 -name "${padded_num}_*.sql" ! -name '*_rollback.sql' | head -1)
    
    if [ -z "$script" ]; then
        print_error "No migration script found for version $padded_num"
        return 1
    fi
    
    echo ""
    print_info "Running $(basename "$script") on $target_name..."
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name - skipping"
        return 1
    fi
    
    ensure_migrations_table "$port" "$user" "$host" "$password"
    run_migration "$port" "$user" "$host" "$script" "$target_name" "$password"
}

# ============================================================================
# Schema Comparison Functions
# ============================================================================

# Get list of tables in database
get_tables() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    " "$password"
}

# Get columns for a table (normalized - ignores DEFAULT presence which is cosmetic)
get_table_columns() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local table=$5
    
    run_sql "$port" "$user" "$host" "
        SELECT column_name || ':' || data_type || 
               CASE WHEN is_nullable = 'NO' THEN ':NOT NULL' ELSE ':NULLABLE' END
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '$table'
        ORDER BY ordinal_position;
    " "$password"
}

# Get indexes for database (normalized - ignores naming convention differences)
get_indexes() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT 
            CASE 
                -- Normalize primary key names to 'PK:tablename'
                WHEN indexname LIKE 'PK_%' OR indexname LIKE '%_pkey' THEN 'PK:' || tablename
                -- Normalize index prefixes (idx_, ix_, IX_) to compare base names
                ELSE tablename || ':' || 
                     REGEXP_REPLACE(
                         REGEXP_REPLACE(indexname, '^(idx_|ix_|IX_)', ''),
                         '_idx$', ''
                     )
            END as normalized_index
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY 1;
    " "$password" | sort -u
}

# Get raw index info (name, table, definition) for sync purposes
get_index_details() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT indexname || '|' || tablename || '|' || indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE 'PK_%'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname;
    " "$password"
}

# Check if an index exists by checking indexed columns on a table
check_index_exists_by_columns() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local table=$5
    local columns=$6
    
    # Check if any index covers these columns
    local result=$(run_sql "$port" "$user" "$host" "
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = '$table'
        AND indexdef LIKE '%($columns)%';
    " "$password")
    
    # Handle empty result
    [ -n "$result" ] && [ "$result" -gt 0 ] 2>/dev/null
}

# Extract columns from index definition
extract_index_columns() {
    local indexdef=$1
    # Extract the part between parentheses
    echo "$indexdef" | sed -n 's/.*(\([^)]*\)).*/\1/p'
}

# Get extensions
get_extensions() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT extname || ':' || extversion
        FROM pg_extension
        WHERE extname NOT IN ('plpgsql')
        ORDER BY extname;
    " "$password"
}

# Get functions (excluding extension-provided functions)
get_functions() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        -- Exclude extension-provided functions (uuid-ossp, pg_stat_statements)
        AND routine_name NOT LIKE 'uuid_%'
        AND routine_name NOT LIKE 'pg_stat_statements%'
        ORDER BY routine_name;
    " "$password"
}

# Compare two lists and show differences
compare_lists() {
    local name=$1
    local list1=$2
    local list2=$3
    local label1=$4
    local label2=$5
    
    local only_in_1=""
    local only_in_2=""
    local in_both=0
    
    # Convert to arrays for comparison
    local -a arr1
    local -a arr2
    
    if [ -n "$list1" ]; then
        while IFS= read -r line; do
            arr1+=("$line")
        done <<< "$list1"
    fi
    
    if [ -n "$list2" ]; then
        while IFS= read -r line; do
            arr2+=("$line")
        done <<< "$list2"
    fi
    
    # Find items only in list1
    for item in "${arr1[@]}"; do
        local found=false
        for item2 in "${arr2[@]}"; do
            if [ "$item" = "$item2" ]; then
                found=true
                in_both=$((in_both + 1))
                break
            fi
        done
        if [ "$found" = false ]; then
            only_in_1="$only_in_1\n    + $item"
        fi
    done
    
    # Find items only in list2
    for item in "${arr2[@]}"; do
        local found=false
        for item1 in "${arr1[@]}"; do
            if [ "$item" = "$item1" ]; then
                found=true
                break
            fi
        done
        if [ "$found" = false ]; then
            only_in_2="$only_in_2\n    + $item"
        fi
    done
    
    # Report
    if [ -z "$only_in_1" ] && [ -z "$only_in_2" ]; then
        print_success "$name: identical (${#arr1[@]} items)"
        return 0
    else
        print_warning "$name: differences found"
        if [ -n "$only_in_1" ]; then
            echo -e "  Only in $label1:$only_in_1"
        fi
        if [ -n "$only_in_2" ]; then
            echo -e "  Only in $label2:$only_in_2"
        fi
        return 1
    fi
}

# ============================================================================
# Command Handlers
# ============================================================================

cmd_status() {
    print_header "Database Migration Status"
    
    local docker_ok=true
    local desktop_ok=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        show_db_status "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "Docker" "$DOCKER_PASSWORD" || docker_ok=false
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        show_db_status "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "Desktop" "$DESKTOP_PASSWORD" || desktop_ok=false
    fi
    
    echo ""
    echo "----------------------------------------"
    echo "Available migration scripts:"
    for script in $(get_migration_scripts); do
        echo "  $(basename "$script")"
    done
}

cmd_run() {
    print_header "Running Pending Migrations"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Confirmation prompt
    if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
        echo ""
        echo "This will apply pending migrations to:"
        if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
            echo "  - Docker (port $DOCKER_PORT)"
        fi
        if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
            echo "  - Desktop (port $DESKTOP_PORT)"
        fi
        echo ""
        read -p "Continue? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            exit 0
        fi
    fi
    
    local docker_ok=true
    local desktop_ok=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        run_pending_migrations "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "Docker" "$DOCKER_PASSWORD" || docker_ok=false
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        run_pending_migrations "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "Desktop" "$DESKTOP_PASSWORD" || desktop_ok=false
    fi
    
    echo ""
    print_header "Migration Complete"
}

cmd_run_all() {
    print_header "Running All Migrations (Fresh Install)"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Confirmation prompt
    if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
        print_warning "This will run ALL migrations, including already applied ones!"
        echo ""
        echo "Target databases:"
        if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
            echo "  - Docker (port $DOCKER_PORT)"
        fi
        if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
            echo "  - Desktop (port $DESKTOP_PORT)"
        fi
        echo ""
        read -p "Are you sure? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            exit 0
        fi
    fi
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        run_all_migrations "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "Docker" "$DOCKER_PASSWORD"
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        run_all_migrations "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "Desktop" "$DESKTOP_PASSWORD"
    fi
    
    echo ""
    print_header "Migration Complete"
}

cmd_script() {
    local script_num=$1
    
    if [ -z "$script_num" ]; then
        print_error "Please specify a script number (e.g., script 13)"
        exit 1
    fi
    
    print_header "Running Migration Script $script_num"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        run_specific_script "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "Docker" "$script_num" "$DOCKER_PASSWORD"
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        run_specific_script "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "Desktop" "$script_num" "$DESKTOP_PASSWORD"
    fi
    
    echo ""
    print_header "Migration Complete"
}

# Initialize migration tracking for existing database
init_migrations() {
    local port=$1
    local user=$2
    local host=$3
    local target_name=$4
    local password=$5
    
    echo ""
    print_info "Initializing migration tracking for $target_name..."
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name - skipping"
        return 1
    fi
    
    ensure_migrations_table "$port" "$user" "$host" "$password"
    
    # Check for key schema elements to determine which migrations are already applied
    local marked_count=0
    
    for script in $(get_migration_scripts); do
        local version=$(get_version_from_script "$script")
        local script_name=$(basename "$script")
        
        # Skip if already tracked
        if is_migration_applied "$port" "$user" "$host" "$version" "$password"; then
            print_info "$script_name already tracked"
            continue
        fi
        
        # Check if this migration's objects exist
        local exists=false
        
        case "$version" in
            00)
                # Check for vector extension
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM pg_extension WHERE extname='vector';" "$password" 2>/dev/null)
                ;;
            01)
                # Check for users table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='users';" "$password" 2>/dev/null)
                ;;
            02)
                # Check for notes table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='notes';" "$password" 2>/dev/null)
                ;;
            03)
                # Check for note_embeddings table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='note_embeddings';" "$password" 2>/dev/null)
                ;;
            04)
                # Check for chat_conversations table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='chat_conversations';" "$password" 2>/dev/null)
                ;;
            05)
                # Check for indexing_jobs table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='indexing_jobs';" "$password" 2>/dev/null)
                ;;
            06)
                # Check for base indexes (ix_notes_user_id)
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM pg_indexes WHERE indexname='ix_notes_user_id';" "$password" 2>/dev/null)
                ;;
            07)
                # Check for generated_images table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='generated_images';" "$password" 2>/dev/null)
                ;;
            08)
                # Check for search_vector column or rag_query_logs table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='rag_query_logs';" "$password" 2>/dev/null)
                ;;
            09)
                # Check for topic_cluster column in rag_query_logs
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.columns WHERE table_name='rag_query_logs' AND column_name='topic_cluster';" "$password" 2>/dev/null)
                ;;
            10)
                # Check for brainstorm_sessions table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='brainstorm_sessions';" "$password" 2>/dev/null)
                ;;
            11)
                # Check for message_images table
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_name='message_images';" "$password" 2>/dev/null)
                ;;
            12)
                # Check for agent_rag_enabled column
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='agent_rag_enabled';" "$password" 2>/dev/null)
                ;;
            13)
                # Check for uuid_v7 column (PostgreSQL 18 features)
                exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='uuid_v7';" "$password" 2>/dev/null)
                ;;
            *)
                # Unknown migration, don't auto-mark
                exists=""
                ;;
        esac
        
        if [ "$exists" = "1" ]; then
            if [ "$DRY_RUN" = true ]; then
                print_info "[DRY-RUN] Would mark $script_name as applied"
            else
                record_migration "$port" "$user" "$host" "$version" "$script_name" "$password"
                print_success "Marked $script_name as applied (schema exists)"
            fi
            marked_count=$((marked_count + 1))
        else
            print_warning "$script_name - schema not found, not marked"
        fi
    done
    
    echo ""
    echo "  Marked $marked_count migrations as applied"
    return 0
}

cmd_init() {
    print_header "Initialize Migration Tracking"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    echo ""
    print_info "This will detect existing schema and mark migrations as applied."
    print_info "Use this for databases that already have the schema but no tracking."
    
    # Confirmation prompt
    if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
        echo ""
        read -p "Continue? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            exit 0
        fi
    fi
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        init_migrations "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "Docker" "$DOCKER_PASSWORD"
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        init_migrations "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "Desktop" "$DESKTOP_PASSWORD"
    fi
    
    echo ""
    print_header "Initialization Complete"
}

cmd_diff() {
    print_header "Schema Comparison: Docker vs Desktop"
    
    # Check both databases are accessible
    echo ""
    print_info "Checking database connections..."
    
    if ! check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
        print_error "Cannot connect to Docker database (port $DOCKER_PORT)"
        echo "  Set POSTGRES_PASSWORD environment variable or use --password option"
        exit 1
    fi
    print_success "Docker database connected"
    
    if ! check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
        print_error "Cannot connect to Desktop database (port $DESKTOP_PORT)"
        exit 1
    fi
    print_success "Desktop database connected"
    
    local has_core_diff=false      # Tables, columns - critical
    local has_index_diff=false     # Indexes - performance (non-critical)
    local has_migration_diff=false # Migrations - tracking
    
    # Compare PostgreSQL versions
    echo ""
    echo -e "${BLUE}PostgreSQL Versions${NC}"
    echo "----------------------------------------"
    local docker_version=$(run_sql "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "SELECT version();" "$DOCKER_PASSWORD" | cut -d' ' -f1-2)
    local desktop_version=$(run_sql "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "SELECT version();" "$DESKTOP_PASSWORD" | cut -d' ' -f1-2)
    echo "  Docker:  $docker_version"
    echo "  Desktop: $desktop_version"
    
    # Compare extensions (informational only - not a schema difference)
    echo ""
    echo -e "${BLUE}Extensions (informational)${NC}"
    echo "----------------------------------------"
    local docker_ext=$(get_extensions "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    local desktop_ext=$(get_extensions "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    
    # Show extensions but don't mark as difference (extensions are environment-specific)
    echo "  Docker:  $(echo "$docker_ext" | tr '\n' ', ' | sed 's/,$//')"
    echo "  Desktop: $(echo "$desktop_ext" | tr '\n' ', ' | sed 's/,$//')"
    
    # Only flag if core extensions differ (vector is required)
    local docker_has_vector=$(echo "$docker_ext" | grep -c '^vector:' || echo "0")
    local desktop_has_vector=$(echo "$desktop_ext" | grep -c '^vector:' || echo "0")
    if [ "$docker_has_vector" != "$desktop_has_vector" ]; then
        print_warning "pgvector extension mismatch!"
        has_core_diff=true
    else
        print_success "Core extensions match (pgvector)"
    fi
    
    # Compare tables (CORE SCHEMA)
    echo ""
    echo -e "${BLUE}Tables (Core Schema)${NC}"
    echo "----------------------------------------"
    local docker_tables=$(get_tables "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    local desktop_tables=$(get_tables "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    if ! compare_lists "Tables" "$docker_tables" "$desktop_tables" "Docker" "Desktop"; then
        has_core_diff=true
    fi
    
    # Compare columns for each common table (CORE SCHEMA)
    echo ""
    echo -e "${BLUE}Table Columns (Core Schema)${NC}"
    echo "----------------------------------------"
    
    # Get common tables
    local common_tables=""
    while IFS= read -r table; do
        if echo "$desktop_tables" | grep -q "^${table}$"; then
            common_tables="$common_tables $table"
        fi
    done <<< "$docker_tables"
    
    for table in $common_tables; do
        local docker_cols=$(get_table_columns "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "$table")
        local desktop_cols=$(get_table_columns "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "$table")
        if ! compare_lists "$table" "$docker_cols" "$desktop_cols" "Docker" "Desktop"; then
            has_core_diff=true
        fi
    done
    
    # Compare indexes (PERFORMANCE - non-critical)
    echo ""
    echo -e "${BLUE}Indexes (Performance)${NC}"
    echo "----------------------------------------"
    local docker_idx=$(get_indexes "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    local desktop_idx=$(get_indexes "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    if ! compare_lists "Indexes" "$docker_idx" "$desktop_idx" "Docker" "Desktop"; then
        has_index_diff=true
        print_info "Index differences are performance optimizations, not schema changes"
    fi
    
    # Compare functions (user-defined only)
    echo ""
    echo -e "${BLUE}User Functions${NC}"
    echo "----------------------------------------"
    local docker_funcs=$(get_functions "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    local desktop_funcs=$(get_functions "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    if ! compare_lists "Functions" "$docker_funcs" "$desktop_funcs" "Docker" "Desktop"; then
        has_core_diff=true
    fi
    
    # Compare applied migrations
    echo ""
    echo -e "${BLUE}Applied Migrations${NC}"
    echo "----------------------------------------"
    ensure_migrations_table "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"
    ensure_migrations_table "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"
    local docker_mig=$(get_applied_migrations "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    local desktop_mig=$(get_applied_migrations "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    if ! compare_lists "Migrations" "$docker_mig" "$desktop_mig" "Docker" "Desktop"; then
        has_migration_diff=true
    fi
    
    # Summary
    echo ""
    print_header "Comparison Summary"
    
    if [ "$has_core_diff" = true ]; then
        print_error "CORE SCHEMA DIFFERS - Tables or columns don't match!"
        echo ""
        echo "To sync the databases, you can:"
        echo "  1. Run pending migrations: ./migrate.sh run"
        echo "  2. Run specific script: ./migrate.sh script N"
        echo "  3. Re-initialize from scratch (destructive)"
    elif [ "$has_migration_diff" = true ]; then
        print_warning "Migration tracking differs (run ./migrate.sh init to sync)"
    elif [ "$has_index_diff" = true ]; then
        print_success "Core schemas are IDENTICAL"
        echo ""
        print_info "Note: Some performance indexes differ between databases."
        echo "      This doesn't affect functionality, only query performance."
    else
        print_success "Schemas are IDENTICAL"
    fi
}

# Sync indexes from Desktop to Docker
cmd_sync_to_docker() {
    print_header "Sync Indexes: Desktop → Docker"
    
    # Check both databases are accessible
    echo ""
    print_info "Checking database connections..."
    
    if ! check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
        print_error "Cannot connect to Docker database (port $DOCKER_PORT)"
        exit 1
    fi
    print_success "Docker database connected (target)"
    
    if ! check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
        print_error "Cannot connect to Desktop database (port $DESKTOP_PORT)"
        exit 1
    fi
    print_success "Desktop database connected (source)"
    
    # Get index details from Desktop (source)
    echo ""
    print_info "Analyzing Desktop indexes..."
    
    local desktop_indexes=$(get_index_details "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
    
    local missing_indexes=""
    local add_count=0
    
    # Find indexes in Desktop that are missing in Docker
    echo ""
    echo -e "${BLUE}Indexes to copy to Docker:${NC}"
    echo "----------------------------------------"
    
    while IFS='|' read -r name table def; do
        [ -z "$name" ] && continue
        local columns=$(extract_index_columns "$def")
        
        # Skip primary keys
        [[ "$name" == PK_* ]] && continue
        [[ "$name" == *_pkey ]] && continue
        
        # Check if Docker has an index with these columns on this table
        if ! check_index_exists_by_columns "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "$table" "$columns"; then
            # Rename to use docker naming convention (ix_ -> idx_)
            local new_name=$(echo "$name" | sed 's/^ix_/idx_/' | sed 's/^IX_/idx_/')
            local new_def=$(echo "$def" | sed "s/$name/$new_name/")
            missing_indexes="$missing_indexes$new_name|$table|$new_def\n"
            add_count=$((add_count + 1))
            echo "  + $new_name on $table ($columns)"
        fi
    done <<< "$desktop_indexes"
    
    if [ $add_count -eq 0 ]; then
        echo ""
        print_success "Docker already has all Desktop indexes!"
        return 0
    fi
    
    echo ""
    echo "  Total: $add_count indexes to create"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No changes made"
        return 0
    fi
    
    # Confirmation
    if [ "$FORCE" != true ]; then
        echo ""
        read -p "Create these indexes in Docker? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            return 0
        fi
    fi
    
    # Apply indexes to Docker
    echo ""
    print_info "Creating indexes in Docker..."
    
    local success_count=0
    local fail_count=0
    
    echo -e "$missing_indexes" | while IFS='|' read -r idx_name table create_stmt; do
        [ -z "$idx_name" ] && continue
        if run_sql "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$create_stmt;" "$DOCKER_PASSWORD" > /dev/null 2>&1; then
            print_success "Created $idx_name"
        else
            print_error "Failed: $idx_name"
        fi
    done
    
    echo ""
    print_header "Sync Complete"
}

# Sync indexes from Docker to Desktop
cmd_sync_to_desktop() {
    print_header "Sync Indexes: Docker → Desktop"
    
    # Check both databases are accessible
    echo ""
    print_info "Checking database connections..."
    
    if ! check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
        print_error "Cannot connect to Docker database (port $DOCKER_PORT)"
        exit 1
    fi
    print_success "Docker database connected (source)"
    
    if ! check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
        print_error "Cannot connect to Desktop database (port $DESKTOP_PORT)"
        exit 1
    fi
    print_success "Desktop database connected (target)"
    
    # Get index details from Docker (source)
    echo ""
    print_info "Analyzing Docker indexes..."
    
    local docker_indexes=$(get_index_details "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
    
    local missing_indexes=""
    local add_count=0
    
    # Find indexes in Docker that are missing in Desktop
    echo ""
    echo -e "${BLUE}Indexes to copy to Desktop:${NC}"
    echo "----------------------------------------"
    
    while IFS='|' read -r name table def; do
        [ -z "$name" ] && continue
        local columns=$(extract_index_columns "$def")
        
        # Skip primary keys
        [[ "$name" == PK_* ]] && continue
        [[ "$name" == *_pkey ]] && continue
        
        # Check if Desktop has an index with these columns on this table
        if ! check_index_exists_by_columns "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "$table" "$columns"; then
            # Rename to use desktop naming convention (idx_ -> ix_)
            local new_name=$(echo "$name" | sed 's/^idx_/ix_/' | sed 's/^IDX_/ix_/')
            local new_def=$(echo "$def" | sed "s/$name/$new_name/")
            missing_indexes="$missing_indexes$new_name|$table|$new_def\n"
            add_count=$((add_count + 1))
            echo "  + $new_name on $table ($columns)"
        fi
    done <<< "$docker_indexes"
    
    if [ $add_count -eq 0 ]; then
        echo ""
        print_success "Desktop already has all Docker indexes!"
        return 0
    fi
    
    echo ""
    echo "  Total: $add_count indexes to create"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No changes made"
        return 0
    fi
    
    # Confirmation
    if [ "$FORCE" != true ]; then
        echo ""
        read -p "Create these indexes in Desktop? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            return 0
        fi
    fi
    
    # Apply indexes to Desktop
    echo ""
    print_info "Creating indexes in Desktop..."
    
    echo -e "$missing_indexes" | while IFS='|' read -r idx_name table create_stmt; do
        [ -z "$idx_name" ] && continue
        if run_sql "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$create_stmt;" "$DESKTOP_PASSWORD" > /dev/null 2>&1; then
            print_success "Created $idx_name"
        else
            print_error "Failed: $idx_name"
        fi
    done
    
    echo ""
    print_header "Sync Complete"
}

# Backup a database using pg_dump
backup_database() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    local backup_dir=$6
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_dir}/secondbrain_${target_name,,}_${timestamp}.sql"
    
    print_info "Backing up $target_name to $backup_file..."
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    if pg_dump -h "$host" -p "$port" -U "$user" -d "$DATABASE" -f "$backup_file" 2>/dev/null; then
        unset PGPASSWORD
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Backup complete: $backup_file ($size)"
        return 0
    else
        unset PGPASSWORD
        print_error "Backup failed for $target_name"
        return 1
    fi
}

cmd_backup() {
    print_header "Database Backup"
    
    # Create backup directory
    local backup_dir="${SCRIPT_DIR}/backups"
    mkdir -p "$backup_dir"
    
    echo ""
    print_info "Backup directory: $backup_dir"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No backups will be created"
        if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
            echo "  Would backup: Docker"
        fi
        if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
            echo "  Would backup: Desktop"
        fi
        return 0
    fi
    
    local success=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        echo ""
        if check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
            backup_database "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" "$backup_dir" || success=false
        else
            print_error "Cannot connect to Docker database"
            success=false
        fi
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        echo ""
        if check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
            backup_database "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" "$backup_dir" || success=false
        else
            print_error "Cannot connect to Desktop database"
            success=false
        fi
    fi
    
    echo ""
    if [ "$success" = true ]; then
        print_header "Backup Complete"
        echo ""
        echo "Backups saved to: $backup_dir"
        ls -la "$backup_dir"/*.sql 2>/dev/null | tail -5
    else
        print_header "Backup Completed with Errors"
    fi
}

cmd_rollback() {
    local rollback_num=$1
    
    if [ -z "$rollback_num" ]; then
        print_error "Please specify a migration number to rollback (e.g., rollback 13)"
        exit 1
    fi
    
    # Pad to 2 digits
    local padded_num=$(printf "%02d" "$rollback_num")
    
    # Find rollback script
    local rollback_script=$(find "$SCRIPT_DIR" -maxdepth 1 -name "${padded_num}_*_rollback.sql" | head -1)
    
    if [ -z "$rollback_script" ]; then
        print_error "No rollback script found for migration $padded_num"
        echo ""
        echo "Available rollback scripts:"
        find "$SCRIPT_DIR" -maxdepth 1 -name '*_rollback.sql' -exec basename {} \; | sort
        exit 1
    fi
    
    print_header "Rollback Migration $padded_num"
    echo ""
    print_info "Rollback script: $(basename "$rollback_script")"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No changes will be made"
        return 0
    fi
    
    # Confirmation
    if [ "$FORCE" != true ]; then
        echo ""
        print_warning "This will UNDO migration $padded_num. This may cause data loss!"
        read -p "Are you sure? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            return 0
        fi
    fi
    
    # Run rollback on target databases
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        echo ""
        if check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
            print_info "Rolling back on Docker..."
            if run_sql_file "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$rollback_script" "$DOCKER_PASSWORD" > /dev/null 2>&1; then
                # Remove from migration tracking
                run_sql "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" \
                    "DELETE FROM schema_migrations WHERE version = '$padded_num';" "$DOCKER_PASSWORD" > /dev/null 2>&1
                print_success "Docker rollback complete"
            else
                print_error "Docker rollback failed"
            fi
        else
            print_error "Cannot connect to Docker"
        fi
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        echo ""
        if check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
            print_info "Rolling back on Desktop..."
            if run_sql_file "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$rollback_script" "$DESKTOP_PASSWORD" > /dev/null 2>&1; then
                # Remove from migration tracking
                run_sql "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" \
                    "DELETE FROM schema_migrations WHERE version = '$padded_num';" "$DESKTOP_PASSWORD" > /dev/null 2>&1
                print_success "Desktop rollback complete"
            else
                print_error "Desktop rollback failed"
            fi
        else
            print_error "Cannot connect to Desktop"
        fi
    fi
    
    echo ""
    print_header "Rollback Complete"
}

# Show database statistics
show_db_stats() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    
    echo ""
    echo -e "${BLUE}$target_name Statistics${NC}"
    echo "========================================"
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name"
        return 1
    fi
    
    # Database size
    local db_size=$(run_sql "$port" "$user" "$host" "SELECT pg_size_pretty(pg_database_size('$DATABASE'));" "$password")
    echo "Database Size: $db_size"
    
    # Table count
    local table_count=$(run_sql "$port" "$user" "$host" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" "$password")
    echo "Tables: $table_count"
    
    # Index count
    local index_count=$(run_sql "$port" "$user" "$host" "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" "$password")
    echo "Indexes: $index_count"
    
    # Total rows
    local total_rows=$(run_sql "$port" "$user" "$host" "
        SELECT SUM(n_live_tup)::bigint 
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public';
    " "$password")
    echo "Total Rows: ${total_rows:-0}"
    
    echo ""
    echo "Table Details:"
    echo "----------------------------------------"
    printf "%-25s %10s %10s\n" "Table" "Rows" "Size"
    echo "----------------------------------------"
    
    run_sql "$port" "$user" "$host" "
        SELECT 
            relname,
            n_live_tup,
            pg_size_pretty(pg_total_relation_size(relid))
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC;
    " "$password" | while IFS='|' read -r table rows size; do
        [ -z "$table" ] && continue
        printf "%-25s %10s %10s\n" "$table" "$rows" "$size"
    done
    
    echo ""
    echo "Index Usage (top 10):"
    echo "----------------------------------------"
    printf "%-35s %10s %10s\n" "Index" "Scans" "Size"
    echo "----------------------------------------"
    
    run_sql "$port" "$user" "$host" "
        SELECT 
            indexrelname,
            idx_scan,
            pg_size_pretty(pg_relation_size(indexrelid))
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 10;
    " "$password" | while IFS='|' read -r idx scans size; do
        [ -z "$idx" ] && continue
        printf "%-35s %10s %10s\n" "$idx" "$scans" "$size"
    done
    
    return 0
}

cmd_stats() {
    print_header "Database Statistics"
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        show_db_stats "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker"
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        show_db_stats "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop"
    fi
    
    echo ""
    print_header "Statistics Complete"
}

# Validate database schema
validate_database() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    
    echo ""
    echo -e "${BLUE}Validating $target_name${NC}"
    echo "----------------------------------------"
    
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name"
        return 1
    fi
    
    local errors=0
    
    # Required tables
    local required_tables="users notes note_embeddings chat_conversations chat_messages"
    
    for table in $required_tables; do
        local exists=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" "$password")
        if [ "$exists" = "1" ]; then
            print_success "Table: $table"
        else
            print_error "Missing table: $table"
            errors=$((errors + 1))
        fi
    done
    
    # Check pgvector extension
    local vector_ext=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM pg_extension WHERE extname='vector';" "$password")
    if [ "$vector_ext" = "1" ]; then
        print_success "Extension: pgvector"
    else
        print_error "Missing extension: pgvector"
        errors=$((errors + 1))
    fi
    
    # Check vector column exists
    local vector_col=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM information_schema.columns WHERE table_name='note_embeddings' AND column_name='embedding';" "$password")
    if [ "$vector_col" = "1" ]; then
        print_success "Vector column: note_embeddings.embedding"
    else
        print_error "Missing vector column: note_embeddings.embedding"
        errors=$((errors + 1))
    fi
    
    # Check critical indexes
    local vector_idx=$(run_sql "$port" "$user" "$host" "SELECT 1 FROM pg_indexes WHERE tablename='note_embeddings' AND indexdef LIKE '%vector%';" "$password")
    if [ "$vector_idx" = "1" ]; then
        print_success "Vector index exists"
    else
        print_warning "No vector index found (may affect search performance)"
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "$target_name validation passed"
        return 0
    else
        print_error "$target_name has $errors validation errors"
        return 1
    fi
}

cmd_validate() {
    print_header "Schema Validation"
    
    local all_valid=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        validate_database "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" || all_valid=false
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        validate_database "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" || all_valid=false
    fi
    
    echo ""
    if [ "$all_valid" = true ]; then
        print_header "All Validations Passed"
    else
        print_header "Validation Completed with Errors"
    fi
}

# Export database schema
export_db_schema() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    local export_dir=$6
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local export_file="${export_dir}/schema_${target_name,,}_${timestamp}.sql"
    
    print_info "Exporting $target_name schema to $export_file..."
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    # Export schema only (no data)
    if pg_dump -h "$host" -p "$port" -U "$user" -d "$DATABASE" --schema-only -f "$export_file" 2>/dev/null; then
        unset PGPASSWORD
        local size=$(du -h "$export_file" | cut -f1)
        print_success "Schema exported: $export_file ($size)"
        return 0
    else
        unset PGPASSWORD
        print_error "Schema export failed for $target_name"
        return 1
    fi
}

cmd_export_schema() {
    print_header "Export Database Schema"
    
    # Create export directory
    local export_dir="${SCRIPT_DIR}/exports"
    mkdir -p "$export_dir"
    
    echo ""
    print_info "Export directory: $export_dir"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No exports will be created"
        return 0
    fi
    
    local success=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        echo ""
        if check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
            export_db_schema "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" "$export_dir" || success=false
        else
            print_error "Cannot connect to Docker database"
            success=false
        fi
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        echo ""
        if check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
            export_db_schema "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" "$export_dir" || success=false
        else
            print_error "Cannot connect to Desktop database"
            success=false
        fi
    fi
    
    echo ""
    if [ "$success" = true ]; then
        print_header "Export Complete"
        echo ""
        echo "Schemas saved to: $export_dir"
        ls -la "$export_dir"/*.sql 2>/dev/null | tail -5
    else
        print_header "Export Completed with Errors"
    fi
}

cmd_test() {
    print_header "Connection Test"
    
    echo ""
    if [ "$LOADED_FROM_ENV" = true ]; then
        print_info "Password loaded from .env file"
        echo ""
    fi
    
    local all_ok=true
    
    # Test Docker
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        echo -n "Docker (port $DOCKER_PORT): "
        if check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
            local version=$(run_sql "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "SELECT version();" "$DOCKER_PASSWORD" | cut -d' ' -f1-2)
            echo -e "${GREEN}✓ Connected${NC} - $version"
        else
            echo -e "${RED}✗ Failed${NC}"
            all_ok=false
        fi
    fi
    
    # Test Desktop
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        echo -n "Desktop (port $DESKTOP_PORT): "
        if check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
            local version=$(run_sql "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "SELECT version();" "$DESKTOP_PASSWORD" | cut -d' ' -f1-2)
            echo -e "${GREEN}✓ Connected${NC} - $version"
        else
            echo -e "${RED}✗ Failed${NC}"
            all_ok=false
        fi
    fi
    
    echo ""
    if [ "$all_ok" = true ]; then
        print_success "All connections successful"
    else
        print_error "Some connections failed"
        exit 1
    fi
}

# ============================================================================
# Main
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
        --help|-h)
            show_help
            exit 0
            ;;
        status|run|run-all|init|diff|sync-to-docker|sync-to-desktop|backup|stats|validate|export-schema|test)
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
    "")
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
