-- ============================================================================
-- Second Brain Database - Variable Embedding Dimensions for Focus Suggestions
-- ============================================================================
-- Migration: 56_focus_suggestions_variable_dimensions.sql
-- Purpose: Support variable-dimension embeddings for different providers
--          in the focus_suggestions table. Mirrors the approach from
--          17_variable_embedding_dimensions.sql for note_embeddings.
--
--          Supported dimensions:
--          - OpenAI: 1536, 3072 dimensions
--          - Gemini: 768 dimensions
--          - Cohere: 1024 dimensions
--          - Ollama: 768, 1024 dimensions
-- ============================================================================

-- Step 1: Check if column needs migration (has fixed dimensions)
DO $$
DECLARE
    v_current_type TEXT;
    v_has_data BOOLEAN;
BEGIN
    -- Get current column type
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_current_type
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'focus_suggestions' AND a.attname = 'embedding';

    -- Check if already variable dimension
    IF v_current_type = 'vector' THEN
        RAISE NOTICE 'Column already has variable dimensions, skipping migration';
        RETURN;
    END IF;

    -- Check if table has data
    SELECT EXISTS(SELECT 1 FROM focus_suggestions WHERE embedding IS NOT NULL)
    INTO v_has_data;

    IF v_has_data THEN
        -- Table has data, use ALTER TYPE
        RAISE NOTICE 'Migrating embedding column with data...';
        EXECUTE 'ALTER TABLE focus_suggestions ALTER COLUMN embedding TYPE vector USING embedding::vector';
    ELSE
        -- Table is empty, drop and recreate for clean state
        RAISE NOTICE 'Table empty, recreating embedding column...';
        EXECUTE 'ALTER TABLE focus_suggestions DROP COLUMN IF EXISTS embedding';
        EXECUTE 'ALTER TABLE focus_suggestions ADD COLUMN embedding vector';
    END IF;

    RAISE NOTICE 'Embedding column migrated to variable dimensions';
END $$;

-- Step 2: Drop the old fixed-dimension index if it exists
DROP INDEX IF EXISTS ix_focus_suggestions_embedding;

-- Step 3: Add index on embedding_dimensions for filtering
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_dimensions
ON focus_suggestions(embedding_dimensions)
WHERE is_deleted = FALSE;

-- Note: HNSW vector indexes require data to exist before they can be created
-- on variable-dimension columns. For small tables like focus_suggestions,
-- queries will work without vector indexes (filtered by user_id first).
-- If performance becomes an issue with large datasets, create dimension-specific
-- indexes after data exists using:
--
-- CREATE INDEX ix_focus_suggestions_embedding_1024
-- ON focus_suggestions USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64)
-- WHERE is_deleted = FALSE AND embedding IS NOT NULL AND embedding_dimensions = 1024;

-- Step 4: Add comments
COMMENT ON COLUMN focus_suggestions.embedding IS 'Vector embedding (variable dimensions) for semantic similarity detection during deduplication';
COMMENT ON COLUMN focus_suggestions.embedding_dimensions IS 'Number of dimensions in the embedding vector (e.g., 768, 1024, 1536, 3072)';

-- ============================================================================
-- Verify migration
-- ============================================================================
DO $$
DECLARE
    v_type_info TEXT;
BEGIN
    -- Check column type
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_type_info
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'focus_suggestions' AND a.attname = 'embedding';

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Focus Suggestions Variable Dimensions Migration';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Embedding column type: %', v_type_info;
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- Rollback script (if needed):
-- ============================================================================
-- DROP INDEX IF EXISTS ix_focus_suggestions_dimensions;
-- ALTER TABLE focus_suggestions DROP COLUMN IF EXISTS embedding;
-- ALTER TABLE focus_suggestions ADD COLUMN embedding vector(1536);
-- ============================================================================
