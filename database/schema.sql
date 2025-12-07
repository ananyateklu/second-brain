-- ============================================================================
-- Second Brain Database - Master Schema Script
-- ============================================================================
-- This script creates the complete database schema by running all scripts
-- in the correct order.
--
-- Usage:
--   psql -d your_database -f schema.sql
--
-- Or from psql prompt:
--   \i schema.sql
--
-- Prerequisites:
--   - PostgreSQL 14+ with pgvector extension available
--   - Database created and user has appropriate permissions
-- ============================================================================

\echo '============================================'
\echo 'Second Brain Database Schema Installation'
\echo '============================================'
\echo ''

-- Step 1: Enable extensions
\echo 'Step 1/19: Enabling extensions...'
\i 00_extensions.sql
\echo 'Extensions enabled successfully.'
\echo ''

-- Step 2: Create users tables
\echo 'Step 2/19: Creating users tables...'
\i 01_users.sql
\echo 'Users tables created successfully.'
\echo ''

-- Step 3: Create notes table
\echo 'Step 3/19: Creating notes table...'
\i 02_notes.sql
\echo 'Notes table created successfully.'
\echo ''

-- Step 4: Create note embeddings table
\echo 'Step 4/19: Creating note_embeddings table...'
\i 03_note_embeddings.sql
\echo 'Note embeddings table created successfully.'
\echo ''

-- Step 5: Create chat tables
\echo 'Step 5/19: Creating chat tables...'
\i 04_chat.sql
\echo 'Chat tables created successfully.'
\echo ''

-- Step 6: Create indexing jobs table
\echo 'Step 6/19: Creating indexing_jobs table...'
\i 05_indexing_jobs.sql
\echo 'Indexing jobs table created successfully.'
\echo ''

-- Step 7: Create base indexes
\echo 'Step 7/19: Creating indexes...'
\i 06_indexes.sql
\echo 'Indexes created successfully.'
\echo ''

-- Step 8: Create generated images table
\echo 'Step 8/19: Creating generated_images table...'
\i 07_generated_images.sql
\echo 'Generated images table created successfully.'
\echo ''

-- Step 9: Add search vectors for hybrid search
\echo 'Step 9/19: Adding search vectors and RAG query logs...'
\i 08_search_vectors.sql
\echo 'Search vectors and RAG query logs created successfully.'
\echo ''

-- Step 10: Add RAG analytics extensions
\echo 'Step 10/19: Adding RAG analytics columns...'
\i 09_rag_analytics.sql
\echo 'RAG analytics columns added successfully.'
\echo ''

-- Step 11: Create brainstorm tables
\echo 'Step 11/19: Creating brainstorm tables...'
\i 10_brainstorm.sql
\echo 'Brainstorm tables created successfully.'
\echo ''

-- Step 12: Create message images table
\echo 'Step 12/19: Creating message_images table...'
\i 11_message_images.sql
\echo 'Message images table created successfully.'
\echo ''

-- Step 13: Add agent_rag_enabled column
\echo 'Step 13/19: Adding agent_rag_enabled column...'
\i 12_agent_rag_enabled.sql
\echo 'Agent RAG enabled column added successfully.'
\echo ''

-- Step 14: PostgreSQL 18 features (UUIDv7, JSONB, optimized indexes)
\echo 'Step 14/19: Enabling PostgreSQL 18 features...'
\i 13_postgresql_18_features.sql
\echo 'PostgreSQL 18 features enabled successfully.'
\echo ''

-- Step 15: Tool call analytics
\echo 'Step 15/19: Adding tool call analytics...'
\i 14_tool_call_analytics.sql
\echo 'Tool call analytics added successfully.'
\echo ''

-- Step 16: Temporal features (PostgreSQL 18)
\echo 'Step 16/19: Adding temporal features...'
\i 15_temporal_features.sql
\echo 'Temporal features added successfully.'
\echo ''

-- Step 17: Add username to users
\echo 'Step 17/19: Adding username to users...'
\i 16_add_username_to_users.sql
\echo 'Username column added successfully.'
\echo ''

-- Step 18: Variable embedding dimensions
\echo 'Step 18/19: Adding variable embedding dimensions support...'
\i 17_variable_embedding_dimensions.sql
\echo 'Variable embedding dimensions support added successfully.'
\echo ''

-- Step 19: Indexing jobs embedding fields
\echo 'Step 19/19: Adding embedding fields to indexing_jobs...'
\i 18_indexing_jobs_embedding_fields.sql
\echo 'Embedding fields added to indexing_jobs successfully.'
\echo ''

\echo '============================================'
\echo 'Schema installation complete!'
\echo '============================================'
\echo ''
\echo 'Tables created:'
\echo '  - users'
\echo '  - user_preferences'
\echo '  - notes'
\echo '  - note_embeddings'
\echo '  - note_versions (temporal)'
\echo '  - chat_conversations'
\echo '  - chat_messages'
\echo '  - chat_sessions (temporal)'
\echo '  - tool_calls'
\echo '  - retrieved_notes'
\echo '  - indexing_jobs'
\echo '  - generated_images'
\echo '  - message_images'
\echo '  - rag_query_logs'
\echo '  - brainstorm_sessions'
\echo '  - brainstorm_results'
\echo ''
\echo 'PostgreSQL 18 Features:'
\echo '  - UUIDv7 columns added'
\echo '  - JSONB columns for tool_calls'
\echo '  - Temporal tables (note_versions, chat_sessions)'
\echo '  - Variable dimension vector support'
\echo '  - Optimized HNSW vector index'
\echo '  - Skip-scan optimized indexes'
\echo '  - Monitoring functions'
\echo ''
\echo 'Total tables: 16 (+ __EFMigrationsHistory created by EF Core)'
\echo '============================================'

