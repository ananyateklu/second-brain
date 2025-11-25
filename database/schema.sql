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
\echo 'Step 1/7: Enabling extensions...'
\i 00_extensions.sql
\echo 'Extensions enabled successfully.'
\echo ''

-- Step 2: Create users tables
\echo 'Step 2/7: Creating users tables...'
\i 01_users.sql
\echo 'Users tables created successfully.'
\echo ''

-- Step 3: Create notes table
\echo 'Step 3/7: Creating notes table...'
\i 02_notes.sql
\echo 'Notes table created successfully.'
\echo ''

-- Step 4: Create note embeddings table
\echo 'Step 4/7: Creating note_embeddings table...'
\i 03_note_embeddings.sql
\echo 'Note embeddings table created successfully.'
\echo ''

-- Step 5: Create chat tables
\echo 'Step 5/7: Creating chat tables...'
\i 04_chat.sql
\echo 'Chat tables created successfully.'
\echo ''

-- Step 6: Create indexing jobs table
\echo 'Step 6/7: Creating indexing_jobs table...'
\i 05_indexing_jobs.sql
\echo 'Indexing jobs table created successfully.'
\echo ''

-- Step 7: Create indexes
\echo 'Step 7/7: Creating indexes...'
\i 06_indexes.sql
\echo 'Indexes created successfully.'
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
\echo ''
\echo 'Total indexes: 17'
\echo '============================================'

