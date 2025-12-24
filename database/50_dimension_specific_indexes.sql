-- ============================================================================
-- Second Brain Database - Dimension-Specific Vector Indexes
-- ============================================================================
-- Migration: 50_dimension_specific_indexes.sql
-- Purpose: Create dimension-specific HNSW indexes for optimal vector search
--          performance across different embedding providers:
--          - OpenAI: 1536, 3072 dimensions
--          - Gemini: 768 dimensions
--          - Ollama: 768, 1024 dimensions
--          - Cohere: 1024 dimensions
--
-- Uses partial indexes (WHERE embedding_dimensions = N) to enable efficient
-- filtered vector searches that only scan relevant embeddings.
--
-- For 1536 dimensions, uses halfvec quantization for 50% memory savings.
-- For other dimensions, uses full-precision vectors.
-- ============================================================================

-- Check if halfvec is available (pgvector 0.7+)
DO $$
DECLARE
    v_halfvec_available BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'halfvec')
    INTO v_halfvec_available;

    IF NOT v_halfvec_available THEN
        RAISE WARNING 'halfvec type not available - pgvector 0.7+ recommended for memory-optimized 1536-dim index';
    END IF;
END $$;

-- ============================================================================
-- 1. Drop existing quantized index (it only works for 1536 dims)
-- ============================================================================
DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_quantized;

-- ============================================================================
-- 2. Create dimension-specific partial HNSW indexes
-- ============================================================================

-- 768 dimensions (Gemini, Ollama nomic-embed-text, BGE base)
-- Uses full-precision vectors
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_768
ON note_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128)
WHERE embedding_dimensions = 768;

-- 1024 dimensions (Ollama mxbai-embed-large, Cohere, BGE large)
-- Uses full-precision vectors
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_1024
ON note_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128)
WHERE embedding_dimensions = 1024;

-- 1536 dimensions (OpenAI text-embedding-3-small, ada-002)
-- Uses halfvec quantization for 50% memory savings (if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'halfvec') THEN
        -- Use quantized halfvec index for memory efficiency
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_1536
        ON note_embeddings USING hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops)
        WITH (m = 24, ef_construction = 128)
        WHERE embedding_dimensions = 1536;

        RAISE NOTICE 'Created quantized halfvec index for 1536 dimensions (50%% memory savings)';
    ELSE
        -- Fall back to full-precision index
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_1536
        ON note_embeddings USING hnsw (embedding vector_cosine_ops)
        WITH (m = 24, ef_construction = 128)
        WHERE embedding_dimensions = 1536;

        RAISE NOTICE 'Created full-precision index for 1536 dimensions (halfvec not available)';
    END IF;
END $$;

-- 3072 dimensions (OpenAI text-embedding-3-large)
-- Uses full-precision vectors
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_3072
ON note_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128)
WHERE embedding_dimensions = 3072;

-- ============================================================================
-- 3. Add comments for documentation
-- ============================================================================
COMMENT ON INDEX ix_embeddings_hnsw_768 IS
    'HNSW index for 768-dimensional embeddings (Gemini, Ollama nomic-embed-text)';
COMMENT ON INDEX ix_embeddings_hnsw_1024 IS
    'HNSW index for 1024-dimensional embeddings (Ollama mxbai-embed-large, Cohere)';
COMMENT ON INDEX ix_embeddings_hnsw_1536 IS
    'HNSW index for 1536-dimensional embeddings (OpenAI). Uses halfvec if available.';
COMMENT ON INDEX ix_embeddings_hnsw_3072 IS
    'HNSW index for 3072-dimensional embeddings (OpenAI text-embedding-3-large)';

-- ============================================================================
-- 4. Verify indexes were created
-- ============================================================================
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE indexname IN (
        'ix_embeddings_hnsw_768',
        'ix_embeddings_hnsw_1024',
        'ix_embeddings_hnsw_1536',
        'ix_embeddings_hnsw_3072'
    );

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Dimension-Specific Indexes Created';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Created % of 4 dimension-specific HNSW indexes', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Supported embedding dimensions:';
    RAISE NOTICE '  - 768:  Gemini, Ollama nomic-embed-text';
    RAISE NOTICE '  - 1024: Ollama mxbai-embed-large, Cohere';
    RAISE NOTICE '  - 1536: OpenAI text-embedding-3-small (quantized)';
    RAISE NOTICE '  - 3072: OpenAI text-embedding-3-large';
    RAISE NOTICE '';
    RAISE NOTICE 'Queries MUST filter by embedding_dimensions to use these indexes.';
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- Rollback script (if needed):
-- ============================================================================
-- DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_768;
-- DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_1024;
-- DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_1536;
-- DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_3072;
-- ============================================================================
