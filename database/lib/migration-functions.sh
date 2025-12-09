#!/bin/bash
# ============================================================================
# Migration Functions Module
# ============================================================================
# Functions for running and managing database migrations

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
