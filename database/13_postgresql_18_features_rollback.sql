-- ============================================================================
-- Second Brain Database - PostgreSQL 18 Features Rollback
-- ============================================================================
-- Use this script to rollback PostgreSQL 18 feature changes if needed
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back PostgreSQL 18 features...';
END $$;

-- ============================================================================
-- 1. Drop UUIDv7 columns and indexes
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_notes_uuid_v7;
DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_uuid_v7;
DROP INDEX CONCURRENTLY IF EXISTS ix_conversations_uuid_v7;
DROP INDEX CONCURRENTLY IF EXISTS ix_messages_uuid_v7;

ALTER TABLE notes DROP COLUMN IF EXISTS uuid_v7;
ALTER TABLE note_embeddings DROP COLUMN IF EXISTS uuid_v7;
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS uuid_v7;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS uuid_v7;

-- ============================================================================
-- 2. Drop skip-scan optimized indexes
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_provider_user_note;
DROP INDEX CONCURRENTLY IF EXISTS ix_conversations_provider_model;
DROP INDEX CONCURRENTLY IF EXISTS ix_messages_role_conversation;

-- ============================================================================
-- 3. Drop JSONB indexes and columns
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_tool_calls_arguments_gin;
DROP INDEX CONCURRENTLY IF EXISTS ix_tool_calls_result_gin;

ALTER TABLE tool_calls DROP COLUMN IF EXISTS arguments_jsonb;
ALTER TABLE tool_calls DROP COLUMN IF EXISTS result_jsonb;

-- ============================================================================
-- 4. Drop optimized HNSW index (will need to recreate original if needed)
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw;

-- ============================================================================
-- 5. Restore original trigger for search_vector (if needed)
-- ============================================================================

-- Recreate original trigger-based approach
CREATE OR REPLACE FUNCTION update_note_embedding_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.note_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_note_embedding_search_vector ON note_embeddings;
CREATE TRIGGER trg_note_embedding_search_vector
    BEFORE INSERT OR UPDATE OF note_title, content ON note_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_note_embedding_search_vector();

-- ============================================================================
-- 6. Drop monitoring functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_pg18_feature_status();
DROP FUNCTION IF EXISTS get_secondbrain_stats();
DROP FUNCTION IF EXISTS compute_search_vector(TEXT, TEXT);

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PostgreSQL 18 features rollback complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: You may need to recreate original indexes manually.';
END $$;
