-- ============================================================================
-- Second Brain Database - Index Definitions
-- ============================================================================
-- Creates all indexes for optimal query performance
-- Total: 17 indexes across 9 tables
-- ============================================================================

-- ===================
-- Users Table Indexes
-- ===================

-- Unique index on email for login lookups
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email
    ON users (email);

-- Index on API key for authentication
CREATE INDEX IF NOT EXISTS ix_users_api_key
    ON users (api_key);

-- =============================
-- User Preferences Table Index
-- =============================

-- Unique index on user_id (1:1 relationship)
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_preferences_user_id
    ON user_preferences (user_id);

-- ===================
-- Notes Table Indexes
-- ===================

-- Index on user_id for filtering user's notes
CREATE INDEX IF NOT EXISTS ix_notes_user_id
    ON notes (user_id);

-- Composite index for external ID lookups (imports)
CREATE INDEX IF NOT EXISTS ix_notes_user_external
    ON notes (user_id, external_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS ix_notes_created_at
    ON notes (created_at);

-- ============================
-- Note Embeddings Table Indexes
-- ============================

-- Index on note_id for retrieving all chunks of a note
CREATE INDEX IF NOT EXISTS ix_note_embeddings_note_id
    ON note_embeddings (note_id);

-- Index on user_id for filtering user's embeddings
CREATE INDEX IF NOT EXISTS ix_note_embeddings_user_id
    ON note_embeddings (user_id);

-- Composite index for note + chunk lookups
CREATE INDEX IF NOT EXISTS ix_note_embeddings_note_chunk
    ON note_embeddings (note_id, chunk_index);

-- ==============================
-- Chat Conversations Table Indexes
-- ==============================

-- Index on user_id for listing user's conversations
CREATE INDEX IF NOT EXISTS ix_chat_conversations_user_id
    ON chat_conversations (user_id);

-- Index on updated_at for sorting by recent activity
CREATE INDEX IF NOT EXISTS ix_chat_conversations_updated_at
    ON chat_conversations (updated_at);

-- ==========================
-- Chat Messages Table Indexes
-- ==========================

-- Index on conversation_id for retrieving messages
CREATE INDEX IF NOT EXISTS ix_chat_messages_conversation_id
    ON chat_messages (conversation_id);

-- Index on timestamp for sorting
CREATE INDEX IF NOT EXISTS ix_chat_messages_timestamp
    ON chat_messages (timestamp);

-- =======================
-- Tool Calls Table Index
-- =======================

-- Index on message_id for retrieving tool calls
CREATE INDEX IF NOT EXISTS ix_tool_calls_message_id
    ON tool_calls (message_id);

-- ==========================
-- Retrieved Notes Table Index
-- ==========================

-- Index on message_id for retrieving RAG context
CREATE INDEX IF NOT EXISTS ix_retrieved_notes_message_id
    ON retrieved_notes (message_id);

-- ==========================
-- Indexing Jobs Table Indexes
-- ==========================

-- Index on user_id for listing user's jobs
CREATE INDEX IF NOT EXISTS ix_indexing_jobs_user_id
    ON indexing_jobs (user_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS ix_indexing_jobs_created_at
    ON indexing_jobs (created_at);

-- Composite index for user + created_at queries
CREATE INDEX IF NOT EXISTS ix_indexing_jobs_user_created
    ON indexing_jobs (user_id, created_at);

