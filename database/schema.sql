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
\echo 'Step 1/11: Enabling extensions...'
\i 00_extensions.sql
\echo 'Extensions enabled successfully.'
\echo ''

-- Step 2: Create users tables
\echo 'Step 2/11: Creating users tables...'
\i 01_users.sql
\echo 'Users tables created successfully.'
\echo ''

-- Step 3: Create notes table
\echo 'Step 3/11: Creating notes table...'
\i 02_notes.sql
\echo 'Notes table created successfully.'
\echo ''

-- Step 4: Create note embeddings table
\echo 'Step 4/11: Creating note_embeddings table...'
\i 03_note_embeddings.sql
\echo 'Note embeddings table created successfully.'
\echo ''

-- Step 5: Create chat tables
\echo 'Step 5/11: Creating chat tables...'
\i 04_chat.sql
\echo 'Chat tables created successfully.'
\echo ''

-- Step 6: Create indexing jobs table
\echo 'Step 6/11: Creating indexing_jobs table...'
\i 05_indexing_jobs.sql
\echo 'Indexing jobs table created successfully.'
\echo ''

-- Step 7: Create base indexes
\echo 'Step 7/11: Creating indexes...'
\i 06_indexes.sql
\echo 'Indexes created successfully.'
\echo ''

-- Step 8: Create generated images table
\echo 'Step 8/11: Creating generated_images table...'
\i 07_generated_images.sql
\echo 'Generated images table created successfully.'
\echo ''

-- Step 9: Add search vectors for hybrid search
\echo 'Step 9/11: Adding search vectors and RAG query logs...'
\i 08_search_vectors.sql
\echo 'Search vectors and RAG query logs created successfully.'
\echo ''

-- Step 10: Add RAG analytics extensions
\echo 'Step 10/11: Adding RAG analytics columns...'
\i 09_rag_analytics.sql
\echo 'RAG analytics columns added successfully.'
\echo ''

-- Step 11: Create brainstorm tables
\echo 'Step 11/11: Creating brainstorm tables...'
\i 10_brainstorm.sql
\echo 'Brainstorm tables created successfully.'
\echo ''

-- Step 12: Create message images table
\echo 'Step 12/12: Creating message_images table...'
\i 11_message_images.sql
\echo 'Message images table created successfully.'
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
\echo '  - chat_conversations'
\echo '  - chat_messages'
\echo '  - tool_calls'
\echo '  - retrieved_notes'
\echo '  - indexing_jobs'
\echo '  - generated_images'
\echo '  - rag_query_logs'
\echo '  - brainstorm_sessions'
\echo '  - brainstorm_results'
\echo '  - message_images'
\echo ''
\echo 'Total tables: 14'
\echo '============================================'

