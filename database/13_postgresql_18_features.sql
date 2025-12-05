-- ============================================================================
-- Second Brain Database - PostgreSQL 18 Features Migration
-- ============================================================================
-- This script enables PostgreSQL 18 features for improved performance
-- Run after upgrading to PostgreSQL 18
-- ============================================================================

-- Check PostgreSQL version
DO $$
BEGIN
    IF current_setting('server_version_num')::int < 180000 THEN
        RAISE EXCEPTION 'PostgreSQL 18 or higher required. Current version: %', 
            current_setting('server_version');
    END IF;
    RAISE NOTICE 'PostgreSQL 18 detected, proceeding with feature enablement...';
END $$;

-- ============================================================================
-- 1. Add UUIDv7 columns for improved index performance
-- ============================================================================
-- UUIDv7 provides time-ordered UUIDs for better B-tree performance

-- Add uuid_v7 columns to existing tables (non-breaking)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS uuid_v7 UUID DEFAULT uuidv7();
ALTER TABLE note_embeddings ADD COLUMN IF NOT EXISTS uuid_v7 UUID DEFAULT uuidv7();
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS uuid_v7 UUID DEFAULT uuidv7();
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS uuid_v7 UUID DEFAULT uuidv7();

-- Backfill existing records with UUIDv7 values
UPDATE notes SET uuid_v7 = uuidv7() WHERE uuid_v7 IS NULL;
UPDATE note_embeddings SET uuid_v7 = uuidv7() WHERE uuid_v7 IS NULL;
UPDATE chat_conversations SET uuid_v7 = uuidv7() WHERE uuid_v7 IS NULL;
UPDATE chat_messages SET uuid_v7 = uuidv7() WHERE uuid_v7 IS NULL;

-- Create indexes on new UUID columns for future use
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_uuid_v7 ON notes(uuid_v7);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_uuid_v7 ON note_embeddings(uuid_v7);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_conversations_uuid_v7 ON chat_conversations(uuid_v7);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_uuid_v7 ON chat_messages(uuid_v7);

-- ============================================================================
-- 2. Add JSONB columns for better JSON handling
-- ============================================================================
-- Native JSONB provides faster queries with JSON_TABLE and path operators

-- Add JSONB columns to tool_calls
ALTER TABLE tool_calls 
    ADD COLUMN IF NOT EXISTS arguments_jsonb JSONB,
    ADD COLUMN IF NOT EXISTS result_jsonb JSONB;

-- Migrate existing JSON text to JSONB (with validation)
UPDATE tool_calls 
SET 
    arguments_jsonb = CASE 
        WHEN arguments IS NOT NULL 
             AND arguments != '' 
             AND arguments != 'null'
             AND arguments ~ '^[\{\[]'  -- Must start with { or [ to be valid JSON
        THEN arguments::jsonb 
        ELSE '{}'::jsonb 
    END,
    result_jsonb = CASE 
        WHEN result IS NOT NULL 
             AND result != '' 
             AND result != 'null'
             AND result ~ '^[\{\[]'  -- Must start with { or [ to be valid JSON
        THEN result::jsonb 
        ELSE '{}'::jsonb 
    END
WHERE arguments_jsonb IS NULL OR result_jsonb IS NULL;

-- Add GIN indexes for JSONB columns (enables efficient JSON path queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_arguments_gin
ON tool_calls USING GIN(arguments_jsonb jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_result_gin
ON tool_calls USING GIN(result_jsonb jsonb_path_ops);

-- ============================================================================
-- 3. Optimize full-text search with helper function
-- ============================================================================
-- Create a reusable function for search vector generation

CREATE OR REPLACE FUNCTION compute_search_vector(title TEXT, content TEXT)
RETURNS tsvector AS $$
BEGIN
    RETURN setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
           setweight(to_tsvector('english', COALESCE(content, '')), 'B');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ensure search_vector is populated for all records
UPDATE note_embeddings
SET search_vector = compute_search_vector(note_title, content)
WHERE search_vector IS NULL;

-- ============================================================================
-- 4. Optimize HNSW index for pgvector 0.8
-- ============================================================================
-- Drop old index if exists and create optimized version

DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_vector;
DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw;

-- Create optimized HNSW index with tuned parameters
-- m=24: More connections per layer for better recall
-- ef_construction=128: Higher quality index build
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw
ON note_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128);

-- ============================================================================
-- 5. Add parallel GIN index for full-text search
-- ============================================================================

-- Set parallel workers for index build
SET max_parallel_maintenance_workers = 4;

-- Recreate GIN index (will use parallel build in PG18)
DROP INDEX CONCURRENTLY IF EXISTS idx_note_embeddings_search_vector;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_embeddings_search_vector
ON note_embeddings USING GIN(search_vector);

-- ============================================================================
-- 6. Add skip-scan optimized indexes
-- ============================================================================
-- These indexes benefit from PostgreSQL 18's skip scan feature

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_provider_user_note
ON note_embeddings(embedding_provider, user_id, note_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_conversations_provider_model
ON chat_conversations(provider, model, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_role_conversation
ON chat_messages(role, conversation_id);

-- ============================================================================
-- 7. Create monitoring function for PostgreSQL 18 features
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pg18_feature_status()
RETURNS TABLE (
    feature_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check PostgreSQL version
    RETURN QUERY SELECT 
        'PostgreSQL Version'::TEXT,
        current_setting('server_version'),
        'Server version number: ' || current_setting('server_version_num');
    
    -- Check Async I/O
    RETURN QUERY SELECT 
        'Async I/O'::TEXT,
        COALESCE(current_setting('io_method', true), 'not set'),
        'io_workers: ' || COALESCE(current_setting('io_workers', true), 'not set');
    
    -- Check pgvector version
    RETURN QUERY SELECT 
        'pgvector'::TEXT,
        (SELECT extversion FROM pg_extension WHERE extname = 'vector'),
        'HNSW index exists: ' || EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'ix_embeddings_hnsw'
        )::TEXT;
    
    -- Check pg_stat_statements
    RETURN QUERY SELECT 
        'pg_stat_statements'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')
            THEN 'enabled' ELSE 'disabled' END,
        '';
    
    -- Check UUIDv7 columns
    RETURN QUERY SELECT 
        'UUIDv7 columns'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notes' AND column_name = 'uuid_v7'
        ) THEN 'added' ELSE 'not added' END,
        '';
    
    -- Check JSONB columns
    RETURN QUERY SELECT 
        'JSONB tool_calls'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tool_calls' AND column_name = 'arguments_jsonb'
        ) THEN 'migrated' ELSE 'not migrated' END,
        '';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Create Second Brain stats function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_secondbrain_stats()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT
) AS $$
BEGIN
    -- Total notes
    RETURN QUERY SELECT 'total_notes'::TEXT, COUNT(*)::TEXT FROM notes WHERE NOT is_deleted;
    
    -- Total embeddings
    RETURN QUERY SELECT 'total_embeddings'::TEXT, COUNT(*)::TEXT FROM note_embeddings;
    
    -- Total conversations
    RETURN QUERY SELECT 'total_conversations'::TEXT, COUNT(*)::TEXT FROM chat_conversations WHERE NOT is_deleted;
    
    -- Total messages
    RETURN QUERY SELECT 'total_messages'::TEXT, COUNT(*)::TEXT FROM chat_messages;
    
    -- RAG queries today
    RETURN QUERY SELECT 'rag_queries_today'::TEXT, COUNT(*)::TEXT 
                 FROM rag_query_logs 
                 WHERE created_at > CURRENT_DATE;
    
    -- Positive feedback rate (last 7 days)
    RETURN QUERY SELECT 'positive_feedback_rate'::TEXT, 
                 COALESCE(
                     ROUND(100.0 * SUM(CASE WHEN user_feedback = 'thumbs_up' THEN 1 ELSE 0 END) /
                           NULLIF(COUNT(*), 0), 1)::TEXT || '%',
                     'N/A'
                 )
                 FROM rag_query_logs
                 WHERE user_feedback IS NOT NULL
                   AND created_at > NOW() - INTERVAL '7 days';
    
    -- Database size
    RETURN QUERY SELECT 'database_size'::TEXT, pg_size_pretty(pg_database_size(current_database()));
    
    -- Embeddings table size
    RETURN QUERY SELECT 'embeddings_table_size'::TEXT, 
                 pg_size_pretty(pg_total_relation_size('note_embeddings'));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Update table comments for documentation
-- ============================================================================

COMMENT ON COLUMN notes.uuid_v7 IS 'UUIDv7 identifier for improved index performance (PostgreSQL 18)';
COMMENT ON COLUMN note_embeddings.uuid_v7 IS 'UUIDv7 identifier for improved index performance (PostgreSQL 18)';
COMMENT ON COLUMN chat_conversations.uuid_v7 IS 'UUIDv7 identifier for improved index performance (PostgreSQL 18)';
COMMENT ON COLUMN chat_messages.uuid_v7 IS 'UUIDv7 identifier for improved index performance (PostgreSQL 18)';
COMMENT ON COLUMN tool_calls.arguments_jsonb IS 'JSONB version of arguments for efficient JSON_TABLE queries (PostgreSQL 18)';
COMMENT ON COLUMN tool_calls.result_jsonb IS 'JSONB version of result for efficient JSON_TABLE queries (PostgreSQL 18)';
COMMENT ON INDEX ix_embeddings_hnsw IS 'Optimized HNSW index for pgvector 0.8 with m=24, ef_construction=128';
COMMENT ON FUNCTION compute_search_vector IS 'Computes weighted tsvector for full-text search (title=A, content=B)';
COMMENT ON FUNCTION get_pg18_feature_status IS 'Returns status of PostgreSQL 18 features for monitoring';
COMMENT ON FUNCTION get_secondbrain_stats IS 'Returns key metrics for Second Brain application monitoring';

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PostgreSQL 18 features migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Feature status:';
END $$;

-- Show feature status
SELECT * FROM get_pg18_feature_status();
