#!/bin/bash
# ============================================================================
# Command Handlers Module
# ============================================================================
# Command handler functions for all migrate.sh commands

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

# ============================================================================
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

cmd_seed() {
    print_header "Seed Database with Test Notes"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No data will be inserted"
    fi
    
    # Determine which database to use (seed only works on one database at a time)
    local port=""
    local user=""
    local host=""
    local password=""
    local target_name=""
    
    if [ "$TARGET_DESKTOP" = true ]; then
        port="$DESKTOP_PORT"
        user="$DESKTOP_USER"
        host="$DESKTOP_HOST"
        password="$DESKTOP_PASSWORD"
        target_name="Desktop"
    elif [ "$TARGET_DOCKER" = true ]; then
        port="$DOCKER_PORT"
        user="$DOCKER_USER"
        host="$DOCKER_HOST"
        password="$DOCKER_PASSWORD"
        target_name="Docker"
    else
        # Default to Desktop for seed
        print_info "No target specified. Please use --docker or --desktop"
        echo ""
        echo "Examples:"
        echo "  ./migrate.sh --desktop seed"
        echo "  ./migrate.sh --docker seed --user-id abc123 --count 100"
        exit 1
    fi
    
    echo ""
    print_info "Target: $target_name (port $port)"
    print_info "Notes to seed: $SEED_COUNT"
    
    # Check connection
    if ! check_connection "$port" "$user" "$host" "$password"; then
        print_error "Cannot connect to $target_name database"
        exit 1
    fi
    print_success "Connected to $target_name"
    
    # Get or prompt for user ID
    local selected_user_id="$SEED_USER_ID"
    
    if [ -z "$selected_user_id" ]; then
        echo ""
        print_info "Available users:"
        echo "----------------------------------------"
        
        local users=$(seed_list_users "$port" "$user" "$host" "$password")
        
        if [ -z "$users" ]; then
            print_error "No active users found in database"
            echo ""
            echo "Please create a user first by registering through the app."
            exit 1
        fi
        
        local user_count=0
        local -a user_ids=()
        
        while IFS='|' read -r uid email name; do
            [ -z "$uid" ] && continue
            user_count=$((user_count + 1))
            user_ids+=("$uid")
            printf "  %d) %s (%s)\n" "$user_count" "$email" "$name"
        done <<< "$users"
        
        echo "----------------------------------------"
        
        if [ $user_count -eq 1 ]; then
            selected_user_id="${user_ids[0]}"
            print_info "Auto-selecting only available user"
        else
            echo ""
            read -p "Select user number (1-$user_count): " user_num
            
            if ! [[ "$user_num" =~ ^[0-9]+$ ]] || [ "$user_num" -lt 1 ] || [ "$user_num" -gt $user_count ]; then
                print_error "Invalid selection"
                exit 1
            fi
            
            selected_user_id="${user_ids[$((user_num - 1))]}"
        fi
    else
        # Validate provided user ID
        if ! seed_validate_user "$port" "$user" "$host" "$password" "$selected_user_id"; then
            print_error "User ID '$selected_user_id' not found or inactive"
            exit 1
        fi
    fi
    
    echo ""
    print_info "Selected user: $selected_user_id"
    
    # Check for existing seeded notes
    local existing_count=$(count_seeded_notes "$port" "$user" "$host" "$password")
    if [ -n "$existing_count" ] && [ "$existing_count" != "0" ]; then
        print_warning "Database already has $existing_count seeded notes"
        echo ""
        echo "Options:"
        echo "  1) Add more notes (total will be $((existing_count + SEED_COUNT)))"
        echo "  2) Remove existing and seed fresh"
        echo "  3) Cancel"
        echo ""
        
        if [ "$FORCE" != true ]; then
            read -p "Choose option (1-3): " -n 1 -r
            echo ""
            
            case $REPLY in
                1)
                    print_info "Adding more notes..."
                    ;;
                2)
                    print_info "Removing existing seeded notes..."
                    remove_seeded_notes "$port" "$user" "$host" "$password" "$target_name"
                    ;;
                *)
                    print_warning "Aborted"
                    exit 0
                    ;;
            esac
        else
            print_info "Adding more notes (--force mode)"
        fi
    fi
    
    # Confirmation
    if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
        echo ""
        print_warning "This will insert $SEED_COUNT notes into $target_name"
        read -p "Continue? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Aborted"
            exit 0
        fi
    fi
    
    # Seed the notes
    seed_insert_notes "$port" "$user" "$host" "$password" "$target_name" "$selected_user_id" "$SEED_COUNT"
    
    # Show summary
    echo ""
    print_header "Seeding Complete"
    echo ""
    local total_count=$(run_sql "$port" "$user" "$host" "SELECT COUNT(*) FROM notes WHERE user_id = '$selected_user_id';" "$password")
    local seeded_count=$(run_sql "$port" "$user" "$host" "SELECT COUNT(*) FROM notes WHERE user_id = '$selected_user_id' AND source = 'seed';" "$password")
    
    echo "  Total notes for user: $total_count"
    echo "  Seeded notes: $seeded_count"
    echo ""
    print_info "Next steps:"
    echo "  1. Run indexing in the app to generate embeddings for RAG"
    echo "  2. Test RAG queries with your seeded knowledge base"
    echo "  3. Test Agent functionality with the notes"
    echo ""
    echo "To remove seeded data later:"
    echo "  ./migrate.sh --$target_name unseed"
}

cmd_unseed() {
    print_header "Remove Seeded Test Data"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No data will be removed"
    fi
    
    local success=true
    
    if [ "$TARGET_DOCKER" = true ] || [ "$TARGET_DESKTOP" = false ]; then
        echo ""
        if check_connection "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD"; then
            local count=$(count_seeded_notes "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD")
            if [ -n "$count" ] && [ "$count" != "0" ]; then
                if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
                    print_warning "This will permanently delete $count seeded notes from Docker"
                    read -p "Continue? [y/N] " -n 1 -r
                    echo ""
                    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                        print_warning "Docker unseed skipped"
                    else
                        remove_seeded_notes "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" || success=false
                    fi
                else
                    remove_seeded_notes "$DOCKER_PORT" "$DOCKER_USER" "$DOCKER_HOST" "$DOCKER_PASSWORD" "Docker" || success=false
                fi
            else
                print_info "No seeded notes found in Docker"
            fi
        else
            print_error "Cannot connect to Docker database"
            success=false
        fi
    fi
    
    if [ "$TARGET_DESKTOP" = true ] || [ "$TARGET_DOCKER" = false ]; then
        echo ""
        if check_connection "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD"; then
            local count=$(count_seeded_notes "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD")
            if [ -n "$count" ] && [ "$count" != "0" ]; then
                if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
                    print_warning "This will permanently delete $count seeded notes from Desktop"
                    read -p "Continue? [y/N] " -n 1 -r
                    echo ""
                    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                        print_warning "Desktop unseed skipped"
                    else
                        remove_seeded_notes "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" || success=false
                    fi
                else
                    remove_seeded_notes "$DESKTOP_PORT" "$DESKTOP_USER" "$DESKTOP_HOST" "$DESKTOP_PASSWORD" "Desktop" || success=false
                fi
            else
                print_info "No seeded notes found in Desktop"
            fi
        else
            print_error "Cannot connect to Desktop database"
            success=false
        fi
    fi
    
    echo ""
    if [ "$success" = true ]; then
        print_header "Unseed Complete"
    else
        print_header "Unseed Completed with Errors"
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

