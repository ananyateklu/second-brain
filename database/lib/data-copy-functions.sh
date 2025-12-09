#!/bin/bash
# ============================================================================
# Data Copy Functions Module
# ============================================================================
# Functions for copying data between databases

# Data Copy Functions
# ============================================================================

# Get row counts for all user tables
get_table_row_counts() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    if [ -n "$password" ]; then
        export PGPASSWORD="$password"
    fi
    
    psql -h "$host" -p "$port" -U "$user" -d "$DATABASE" -t -A <<'EOF'
SELECT 
    t.table_name,
    (xpath('/row/cnt/text()', xml_count))[1]::text::bigint as row_count
FROM information_schema.tables t
CROSS JOIN LATERAL (
    SELECT query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', t.table_schema, t.table_name), false, true, '') as xml_count
) x
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN ('__EFMigrationsHistory', 'schema_migrations')
ORDER BY t.table_name;
EOF
    unset PGPASSWORD
}

# Display row counts in a formatted table
display_row_counts() {
    local source_port=$1
    local source_user=$2
    local source_host=$3
    local source_password=$4
    local source_name=$5
    local target_port=$6
    local target_user=$7
    local target_host=$8
    local target_password=$9
    local target_name=${10}
    
    echo ""
    printf "%-30s %15s %15s\n" "TABLE" "$source_name" "$target_name"
    echo "--------------------------------------------------------------"
    
    local total_source=0
    local total_target=0
    
    # Get source counts
    local source_counts=$(get_table_row_counts "$source_port" "$source_user" "$source_host" "$source_password")
    local target_counts=$(get_table_row_counts "$target_port" "$target_user" "$target_host" "$target_password")
    
    # Process and display
    while IFS='|' read -r table count; do
        [ -z "$table" ] && continue
        local target_count=$(echo "$target_counts" | grep "^$table|" | cut -d'|' -f2)
        [ -z "$target_count" ] && target_count=0
        
        printf "%-30s %15s %15s\n" "$table" "$count" "$target_count"
        total_source=$((total_source + count))
        total_target=$((total_target + target_count))
    done <<< "$source_counts"
    
    echo "--------------------------------------------------------------"
    printf "%-30s %15s %15s\n" "TOTAL ROWS" "$total_source" "$total_target"
    
    echo ""
    return $total_source
}

# Copy all data from source to target database
copy_database_data() {
    local source_port=$1
    local source_user=$2
    local source_host=$3
    local source_password=$4
    local source_name=$5
    local target_port=$6
    local target_user=$7
    local target_host=$8
    local target_password=$9
    local target_name=${10}
    
    print_info "Creating data dump from $source_name..."
    
    # Create temp file for data dump
    local temp_dump=$(mktemp)
    trap "rm -f $temp_dump" EXIT
    
    # Export data only (no schema) from source
    if [ -n "$source_password" ]; then
        export PGPASSWORD="$source_password"
    fi
    
    # pg_dump with data only, disable triggers during restore
    if ! pg_dump -h "$source_host" -p "$source_port" -U "$source_user" -d "$DATABASE" \
        --data-only \
        --disable-triggers \
        --no-owner \
        --no-privileges \
        --exclude-table='__EFMigrationsHistory' \
        --exclude-table='schema_migrations' \
        -f "$temp_dump" 2>/dev/null; then
        unset PGPASSWORD
        print_error "Failed to dump data from $source_name"
        return 1
    fi
    unset PGPASSWORD
    
    local dump_size=$(du -h "$temp_dump" | cut -f1)
    print_success "Data dump created ($dump_size)"
    
    print_info "Clearing existing data in $target_name..."
    
    # Clear target tables in correct order (respecting foreign keys)
    if [ -n "$target_password" ]; then
        export PGPASSWORD="$target_password"
    fi
    
    # Get tables in dependency order (children first)
    local tables_to_clear=$(psql -h "$target_host" -p "$target_port" -U "$target_user" -d "$DATABASE" -t -A <<'EOF'
WITH RECURSIVE fk_tree AS (
    SELECT 
        tc.table_name,
        0 as level
    FROM information_schema.tables tc
    WHERE tc.table_schema = 'public' 
      AND tc.table_type = 'BASE TABLE'
      AND tc.table_name NOT IN ('__EFMigrationsHistory', 'schema_migrations')
      AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc2
          JOIN information_schema.constraint_column_usage ccu 
            ON tc2.constraint_name = ccu.constraint_name
          WHERE tc2.constraint_type = 'FOREIGN KEY'
            AND tc2.table_name = tc.table_name
      )
    UNION ALL
    SELECT 
        tc.table_name,
        ft.level + 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    JOIN fk_tree ft ON ft.table_name = ccu.table_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name NOT IN ('__EFMigrationsHistory', 'schema_migrations')
),
max_levels AS (
    SELECT table_name, MAX(level) as max_level
    FROM fk_tree
    GROUP BY table_name
)
SELECT table_name FROM max_levels ORDER BY max_level DESC;
EOF
)
    
    # Clear tables in reverse dependency order using TRUNCATE CASCADE
    for table in $tables_to_clear; do
        psql -h "$target_host" -p "$target_port" -U "$target_user" -d "$DATABASE" -q \
            -c "TRUNCATE TABLE \"$table\" CASCADE;" 2>/dev/null || true
    done
    print_success "Target tables cleared"
    
    print_info "Importing data to $target_name..."
    
    # Import data with triggers disabled
    if psql -h "$target_host" -p "$target_port" -U "$target_user" -d "$DATABASE" \
        -q -f "$temp_dump" 2>/dev/null; then
        unset PGPASSWORD
        print_success "Data import complete"
        return 0
    else
        unset PGPASSWORD
        print_error "Data import failed"
        return 1
    fi
}

cmd_copy_to_docker() {
    print_header "Copy Data: Desktop → Docker"
    
    echo ""
    print_warning "⚠️  WARNING: This will OVERWRITE all data in Docker database!"
    print_warning "   All existing data in Docker will be replaced with Desktop data."
    echo ""
    
    # Check both databases are accessible
    print_info "Checking database connections..."
    
    if ! check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
        print_error "Cannot connect to Desktop database (port $DESKTOP_PORT)"
        exit 1
    fi
    print_success "Desktop database connected (source)"
    
    if ! check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
        print_error "Cannot connect to Docker database (port $DOCKER_PORT)"
        exit 1
    fi
    print_success "Docker database connected (target)"
    
    # Display row counts
    echo ""
    print_info "Data comparison:"
    display_row_counts \
        "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" \
        "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No changes made"
        print_info "Would copy: All Desktop data → Docker"
        return 0
    fi
    
    # Confirmation
    if [ "$FORCE" != true ]; then
        echo ""
        print_warning "This action cannot be undone! A backup will be created first."
        read -p "Copy all Desktop data to Docker? Type 'yes' to confirm: " confirm
        if [ "$confirm" != "yes" ]; then
            print_warning "Aborted"
            return 0
        fi
    fi
    
    # Create backup of target first
    echo ""
    local backup_dir="${SCRIPT_DIR}/backups"
    mkdir -p "$backup_dir"
    print_info "Creating backup of Docker database before overwrite..."
    backup_database "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker_pre_copy" "$backup_dir"
    
    # Perform the copy
    echo ""
    if copy_database_data \
        "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" \
        "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker"; then
        
        echo ""
        print_info "Final row counts:"
        display_row_counts \
            "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" \
            "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker"
        
        echo ""
        print_header "Copy Complete"
        print_success "All Desktop data has been copied to Docker"
        print_info "Backup saved to: $backup_dir"
    else
        print_error "Copy failed - Docker database may be in inconsistent state"
        print_info "Restore from backup: $backup_dir"
        exit 1
    fi
}

cmd_copy_to_desktop() {
    print_header "Copy Data: Docker → Desktop"
    
    echo ""
    print_warning "⚠️  WARNING: This will OVERWRITE all data in Desktop database!"
    print_warning "   All existing data in Desktop will be replaced with Docker data."
    echo ""
    
    # Check both databases are accessible
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
    
    # Display row counts
    echo ""
    print_info "Data comparison:"
    display_row_counts \
        "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" \
        "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        print_warning "DRY RUN - No changes made"
        print_info "Would copy: All Docker data → Desktop"
        return 0
    fi
    
    # Confirmation
    if [ "$FORCE" != true ]; then
        echo ""
        print_warning "This action cannot be undone! A backup will be created first."
        read -p "Copy all Docker data to Desktop? Type 'yes' to confirm: " confirm
        if [ "$confirm" != "yes" ]; then
            print_warning "Aborted"
            return 0
        fi
    fi
    
    # Create backup of target first
    echo ""
    local backup_dir="${SCRIPT_DIR}/backups"
    mkdir -p "$backup_dir"
    print_info "Creating backup of Desktop database before overwrite..."
    backup_database "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop_pre_copy" "$backup_dir"
    
    # Perform the copy
    echo ""
    if copy_database_data \
        "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" \
        "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop"; then
        
        echo ""
        print_info "Final row counts:"
        display_row_counts \
            "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" \
            "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop"
        
        echo ""
        print_header "Copy Complete"
        print_success "All Docker data has been copied to Desktop"
        print_info "Backup saved to: $backup_dir"
    else
        print_error "Copy failed - Desktop database may be in inconsistent state"
        print_info "Restore from backup: $backup_dir"
        exit 1
    fi
}

