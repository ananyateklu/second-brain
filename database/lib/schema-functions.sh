#!/bin/bash
# ============================================================================
# Schema Comparison Functions Module
# ============================================================================
# Functions for comparing database schemas

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
