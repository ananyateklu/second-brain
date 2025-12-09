#!/bin/bash
# ============================================================================
# Database Functions Module
# ============================================================================
# Database connection and SQL execution functions

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
