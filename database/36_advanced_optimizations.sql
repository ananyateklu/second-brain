-- ============================================================================
-- Second Brain Database - Advanced PostgreSQL 18 & pgvector 0.8 Optimizations
-- ============================================================================
-- This script implements cutting-edge optimizations based on latest research:
--
--   1. Vector Quantization (halfvec) - 50% memory savings
--   2. pgvector 0.8 Iterative Scan - Better filtered query recall
--   3. FILLFACTOR Tuning - Reduced page splits for high-update tables
--   4. Index Deduplication - Smaller indexes for repeated values
--   5. HNSW Search Parameters - Optimized ef_search for RAG workloads
--   6. Expression Indexes - Faster case-insensitive searches
--   7. Prepared Statement Templates - Pre-compiled hot-path queries
--   8. Advanced GUC Settings - Session-level optimizations
--
-- Requirements:
--   - PostgreSQL 18+
--   - pgvector 0.7+ (for halfvec quantization)
--   - pgvector 0.8+ (for iterative scan)
-- ============================================================================

-- Check PostgreSQL and pgvector versions
DO $$
DECLARE
    v_pg_version INT;
    v_pgvector_version TEXT;
BEGIN
    v_pg_version := current_setting('server_version_num')::int;

    SELECT extversion INTO v_pgvector_version
    FROM pg_extension WHERE extname = 'vector';

    IF v_pg_version < 180000 THEN
        RAISE WARNING 'PostgreSQL 18+ recommended. Current: %', current_setting('server_version');
    END IF;

    IF v_pgvector_version IS NULL THEN
        RAISE EXCEPTION 'pgvector extension not installed';
    END IF;

    RAISE NOTICE 'PostgreSQL version: % | pgvector version: %',
        current_setting('server_version'), v_pgvector_version;
    RAISE NOTICE 'Applying advanced optimizations...';
END $$;

-- ============================================================================
-- 1. VECTOR QUANTIZATION - Scalar Quantization with halfvec
-- ============================================================================
-- halfvec uses 2-byte floats instead of 4-byte, providing:
--   - 50% memory reduction for vector indexes
--   - Similar recall quality (within 1-2%)
--   - Faster index scans due to smaller memory footprint
--
-- Strategy: Keep full precision vectors in table, quantize in index
-- This allows re-indexing with different quantization without data loss

-- Create quantized HNSW index alongside existing index
-- The quantized index will be preferred for searches due to smaller size
DO $$
BEGIN
    -- Check if halfvec type is available (pgvector 0.7+)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'halfvec') THEN
        -- Drop existing quantized index if exists
        DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_hnsw_quantized;

        -- Create quantized HNSW index using expression index
        -- Casts full-precision vector to halfvec for index storage
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_hnsw_quantized
        ON note_embeddings USING hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops)
        WITH (m = 24, ef_construction = 128);

        RAISE NOTICE '✓ Created quantized HNSW index (halfvec) - 50%% memory savings';
    ELSE
        RAISE WARNING 'halfvec type not available - upgrade pgvector to 0.7+';
    END IF;
END $$;

-- Create function to search with quantized vectors
CREATE OR REPLACE FUNCTION search_embeddings_quantized(
    p_query_embedding vector(1536),
    p_user_id TEXT,
    p_limit INT DEFAULT 10,
    p_ef_search INT DEFAULT 100
)
RETURNS TABLE (
    id TEXT,
    note_id TEXT,
    note_title TEXT,
    content TEXT,
    chunk_index INT,
    distance FLOAT,
    similarity FLOAT
) AS $$
BEGIN
    -- Set search-time parameter for better recall
    PERFORM set_config('hnsw.ef_search', p_ef_search::TEXT, true);

    RETURN QUERY
    SELECT
        ne.id,
        ne.note_id,
        ne.note_title,
        ne.content,
        ne.chunk_index,
        (ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536))::FLOAT AS distance,
        (1 - (ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536)))::FLOAT AS similarity
    FROM note_embeddings ne
    WHERE ne.user_id = p_user_id
    ORDER BY ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536)
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. PGVECTOR 0.8 ITERATIVE SCAN CONFIGURATION
-- ============================================================================
-- Iterative scan prevents "overfiltering" when combining vector search with
-- WHERE clauses. Without it, HNSW might return fewer results than requested.
--
-- Settings:
--   hnsw.iterative_scan: 'relaxed_order' allows continuing search
--   hnsw.max_scan_tuples: Maximum tuples to scan before giving up

-- Create function to configure iterative scan for a session
CREATE OR REPLACE FUNCTION configure_vector_search(
    p_ef_search INT DEFAULT 100,
    p_enable_iterative_scan BOOLEAN DEFAULT true,
    p_max_scan_tuples INT DEFAULT 20000
)
RETURNS void AS $$
BEGIN
    -- Set HNSW search-time parameters
    PERFORM set_config('hnsw.ef_search', p_ef_search::TEXT, true);

    -- Enable iterative scan for filtered queries (pgvector 0.8+)
    IF p_enable_iterative_scan THEN
        PERFORM set_config('hnsw.iterative_scan', 'relaxed_order', true);
        PERFORM set_config('hnsw.max_scan_tuples', p_max_scan_tuples::TEXT, true);
    ELSE
        PERFORM set_config('hnsw.iterative_scan', 'off', true);
    END IF;

    -- Also configure IVFFlat if used
    PERFORM set_config('ivfflat.iterative_scan',
        CASE WHEN p_enable_iterative_scan THEN 'on' ELSE 'off' END, true);
    PERFORM set_config('ivfflat.max_probes', '20', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FILLFACTOR TUNING - Reduce Page Splits on High-Update Tables
-- ============================================================================
-- FILLFACTOR controls how full to pack table pages during INSERT.
-- Lower values leave room for UPDATE operations to avoid page splits.
--
-- Recommendations:
--   - High-update tables: 70-85%
--   - Read-mostly tables: 90-100% (default)
--   - Indexes on high-update columns: 70-80%

-- Tables with frequent updates
ALTER TABLE tool_calls SET (fillfactor = 80);
ALTER TABLE chat_messages SET (fillfactor = 85);
ALTER TABLE rag_query_logs SET (fillfactor = 85);
ALTER TABLE chat_sessions SET (fillfactor = 80);

-- Tables with moderate updates
ALTER TABLE notes SET (fillfactor = 90);
ALTER TABLE chat_conversations SET (fillfactor = 90);
ALTER TABLE note_embeddings SET (fillfactor = 90);

-- High-churn indexes (rebuilt with new fillfactor)
DO $$
BEGIN
    -- Indexes on frequently updated columns
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_tool_calls_message_id') THEN
        ALTER INDEX ix_tool_calls_message_id SET (fillfactor = 80);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_chat_messages_timestamp') THEN
        ALTER INDEX ix_chat_messages_timestamp SET (fillfactor = 85);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_rag_query_logs_created_at_brin') THEN
        -- BRIN indexes don't use fillfactor, skip
        NULL;
    END IF;

    RAISE NOTICE '✓ FILLFACTOR configured for high-update tables and indexes';
END $$;

-- ============================================================================
-- 4. INDEX DEDUPLICATION - Smaller Indexes for Repeated Values
-- ============================================================================
-- B-tree deduplication (PostgreSQL 13+) stores repeated values once,
-- reducing index size by 10-30% for columns with repeated values.

DO $$
BEGIN
    -- Enable deduplication on indexes with many repeated values
    -- user_id columns typically have high repetition

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_notes_user_id') THEN
        ALTER INDEX ix_notes_user_id SET (deduplicate_items = on);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_note_embeddings_user_id') THEN
        ALTER INDEX ix_note_embeddings_user_id SET (deduplicate_items = on);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_chat_conversations_user_id') THEN
        ALTER INDEX ix_chat_conversations_user_id SET (deduplicate_items = on);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_chat_messages_conversation_id') THEN
        ALTER INDEX ix_chat_messages_conversation_id SET (deduplicate_items = on);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rag_query_logs_user_id') THEN
        ALTER INDEX idx_rag_query_logs_user_id SET (deduplicate_items = on);
    END IF;

    RAISE NOTICE '✓ Index deduplication enabled for high-repetition columns';
END $$;

-- ============================================================================
-- 5. OPTIMIZED HYBRID SEARCH FUNCTION
-- ============================================================================
-- Single-query hybrid search with RRF, using all optimizations:
--   - Quantized vector search
--   - Native BM25 with ts_rank_cd
--   - Reciprocal Rank Fusion in SQL
--   - Iterative scan support

CREATE OR REPLACE FUNCTION hybrid_search_optimized(
    p_query_embedding vector(1536),
    p_query_text TEXT,
    p_user_id TEXT,
    p_limit INT DEFAULT 10,
    p_vector_weight FLOAT DEFAULT 0.7,
    p_bm25_weight FLOAT DEFAULT 0.3,
    p_rrf_k INT DEFAULT 60,
    p_ef_search INT DEFAULT 100
)
RETURNS TABLE (
    note_id TEXT,
    note_title TEXT,
    content TEXT,
    chunk_index INT,
    vector_score FLOAT,
    bm25_score FLOAT,
    rrf_score FLOAT,
    final_score FLOAT
) AS $$
BEGIN
    -- Configure search parameters
    PERFORM configure_vector_search(p_ef_search, true, 20000);

    RETURN QUERY
    WITH
    -- Vector search with quantized index
    vector_results AS (
        SELECT
            ne.note_id,
            ne.note_title,
            ne.content,
            ne.chunk_index,
            (1 - (ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536)))::FLOAT AS score,
            ROW_NUMBER() OVER (
                ORDER BY ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536)
            ) AS rank
        FROM note_embeddings ne
        WHERE ne.user_id = p_user_id
        ORDER BY ne.embedding::halfvec(1536) <=> p_query_embedding::halfvec(1536)
        LIMIT p_limit * 3  -- Oversample for RRF fusion
    ),
    -- BM25 search with full-text
    bm25_results AS (
        SELECT
            ne.note_id,
            ne.note_title,
            ne.content,
            ne.chunk_index,
            ts_rank_cd(ne.search_vector, plainto_tsquery('english', p_query_text))::FLOAT AS score,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(ne.search_vector, plainto_tsquery('english', p_query_text)) DESC
            ) AS rank
        FROM note_embeddings ne
        WHERE ne.user_id = p_user_id
          AND ne.search_vector @@ plainto_tsquery('english', p_query_text)
        ORDER BY ts_rank_cd(ne.search_vector, plainto_tsquery('english', p_query_text)) DESC
        LIMIT p_limit * 3
    ),
    -- Reciprocal Rank Fusion
    fused_results AS (
        SELECT
            COALESCE(v.note_id, b.note_id) AS note_id,
            COALESCE(v.note_title, b.note_title) AS note_title,
            COALESCE(v.content, b.content) AS content,
            COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
            COALESCE(v.score, 0) AS vector_score,
            COALESCE(b.score, 0) AS bm25_score,
            -- RRF formula: 1/(k + rank)
            (p_vector_weight * COALESCE(1.0 / (p_rrf_k + v.rank), 0)) +
            (p_bm25_weight * COALESCE(1.0 / (p_rrf_k + b.rank), 0)) AS rrf_score
        FROM vector_results v
        FULL OUTER JOIN bm25_results b
            ON v.note_id = b.note_id AND v.chunk_index = b.chunk_index
    )
    SELECT
        f.note_id,
        f.note_title,
        f.content,
        f.chunk_index,
        f.vector_score,
        f.bm25_score,
        f.rrf_score,
        -- Normalized final score (0-1 range)
        (f.rrf_score / NULLIF(MAX(f.rrf_score) OVER (), 0))::FLOAT AS final_score
    FROM fused_results f
    ORDER BY f.rrf_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. PREPARED STATEMENT TEMPLATES
-- ============================================================================
-- Pre-compiled statements for hot-path queries eliminate planning overhead

-- Note: PREPARE statements are session-scoped
-- These are templates - actual preparation happens at connection init

-- Template for vector-only search
CREATE OR REPLACE FUNCTION prepare_vector_search_statement()
RETURNS void AS $$
BEGIN
    -- Deallocate if exists (ignore error if not)
    BEGIN
        DEALLOCATE vector_search_stmt;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    PREPARE vector_search_stmt (vector(1536), text, int) AS
    SELECT
        ne.id, ne.note_id, ne.note_title, ne.content, ne.chunk_index,
        (ne.embedding::halfvec(1536) <=> $1::halfvec(1536)) AS distance
    FROM note_embeddings ne
    WHERE ne.user_id = $2
    ORDER BY ne.embedding::halfvec(1536) <=> $1::halfvec(1536)
    LIMIT $3;
END;
$$ LANGUAGE plpgsql;

-- Template for BM25-only search
CREATE OR REPLACE FUNCTION prepare_bm25_search_statement()
RETURNS void AS $$
BEGIN
    BEGIN
        DEALLOCATE bm25_search_stmt;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    PREPARE bm25_search_stmt (text, text, int) AS
    SELECT
        ne.id, ne.note_id, ne.note_title, ne.content, ne.chunk_index,
        ts_rank_cd(ne.search_vector, plainto_tsquery('english', $1)) AS score
    FROM note_embeddings ne
    WHERE ne.user_id = $2
      AND ne.search_vector @@ plainto_tsquery('english', $1)
    ORDER BY ts_rank_cd(ne.search_vector, plainto_tsquery('english', $1)) DESC
    LIMIT $3;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ADDITIONAL EXPRESSION INDEXES
-- ============================================================================
-- Expression indexes for common query patterns

-- Case-insensitive tag search
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_tags_gin
ON notes USING GIN(tags)
WHERE NOT is_deleted;

-- Trigram index for fuzzy note title search (requires pg_trgm extension)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_title_trgm
        ON notes USING GIN(title gin_trgm_ops)
        WHERE NOT is_deleted;

        RAISE NOTICE '✓ Trigram index created for fuzzy title search';
    ELSE
        RAISE NOTICE 'pg_trgm extension not available - skipping trigram index';
    END IF;
END $$;

-- Provider + model combination index for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_provider_model_stats
ON chat_messages(conversation_id)
INCLUDE (input_tokens, output_tokens, duration_ms)
WHERE input_tokens IS NOT NULL;

-- ============================================================================
-- 8. STATISTICS IMPROVEMENTS
-- ============================================================================
-- Increase statistics targets for better query planning

-- High-cardinality columns need higher statistics
ALTER TABLE note_embeddings ALTER COLUMN note_id SET STATISTICS 1000;
ALTER TABLE note_embeddings ALTER COLUMN embedding_provider SET STATISTICS 200;
ALTER TABLE chat_messages ALTER COLUMN conversation_id SET STATISTICS 1000;
ALTER TABLE rag_query_logs ALTER COLUMN query SET STATISTICS 500;

-- ============================================================================
-- 9. MONITORING ENHANCEMENTS
-- ============================================================================

-- Function to get vector index statistics
CREATE OR REPLACE FUNCTION get_vector_index_stats()
RETURNS TABLE (
    index_name TEXT,
    index_size TEXT,
    index_type TEXT,
    tuples_indexed BIGINT,
    pages BIGINT,
    is_quantized BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.indexrelname::TEXT AS index_name,
        pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
        am.amname::TEXT AS index_type,
        c.reltuples::BIGINT AS tuples_indexed,
        c.relpages::BIGINT AS pages,
        i.indexrelname LIKE '%quantized%' AS is_quantized
    FROM pg_stat_user_indexes i
    JOIN pg_class c ON i.indexrelid = c.oid
    JOIN pg_am am ON c.relam = am.oid
    WHERE am.amname IN ('hnsw', 'ivfflat')
    ORDER BY pg_relation_size(i.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get search performance metrics
CREATE OR REPLACE FUNCTION get_search_performance_stats()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    recommendation TEXT
) AS $$
DECLARE
    v_cache_hit_ratio NUMERIC;
    v_idx_scan_ratio NUMERIC;
    v_embedding_count BIGINT;
BEGIN
    -- Cache hit ratio
    SELECT ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2)
    INTO v_cache_hit_ratio
    FROM pg_statio_user_tables
    WHERE relname = 'note_embeddings';

    RETURN QUERY VALUES
        ('embedding_cache_hit_ratio',
         COALESCE(v_cache_hit_ratio::TEXT || '%', 'N/A'),
         CASE
            WHEN v_cache_hit_ratio < 90 THEN 'Consider increasing shared_buffers'
            ELSE 'Good cache performance'
         END);

    -- Total embeddings
    SELECT COUNT(*) INTO v_embedding_count FROM note_embeddings;

    RETURN QUERY VALUES
        ('total_embeddings',
         v_embedding_count::TEXT,
         CASE
            WHEN v_embedding_count > 100000 THEN 'Consider partitioning embeddings table'
            WHEN v_embedding_count > 1000000 THEN 'Consider dedicated vector database'
            ELSE 'Scale is manageable for PostgreSQL'
         END);

    -- Index usage
    SELECT ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2)
    INTO v_idx_scan_ratio
    FROM pg_stat_user_tables
    WHERE relname = 'note_embeddings';

    RETURN QUERY VALUES
        ('index_usage_ratio',
         COALESCE(v_idx_scan_ratio::TEXT || '%', 'N/A'),
         CASE
            WHEN v_idx_scan_ratio < 80 THEN 'Some queries may not be using indexes'
            ELSE 'Good index utilization'
         END);

    -- HNSW parameters
    RETURN QUERY VALUES
        ('hnsw.ef_search',
         current_setting('hnsw.ef_search', true),
         'Higher values = better recall, slower queries');

    RETURN QUERY VALUES
        ('hnsw.iterative_scan',
         COALESCE(current_setting('hnsw.iterative_scan', true), 'not set'),
         'Enable for filtered queries: SET hnsw.iterative_scan = ''relaxed_order''');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. SESSION INITIALIZATION FUNCTION
-- ============================================================================
-- Call this at the start of each database session for optimal RAG performance

CREATE OR REPLACE FUNCTION init_rag_session(
    p_ef_search INT DEFAULT 100,
    p_enable_jit BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
    -- Vector search optimization
    PERFORM configure_vector_search(p_ef_search, true, 20000);

    -- JIT compilation for complex queries
    IF p_enable_jit THEN
        PERFORM set_config('jit', 'on', true);
        PERFORM set_config('jit_above_cost', '50000', true);
    END IF;

    -- Work memory for sorting/hashing
    PERFORM set_config('work_mem', '128MB', true);

    -- Parallel query settings
    PERFORM set_config('max_parallel_workers_per_gather', '2', true);

    -- Prepare common statements
    PERFORM prepare_vector_search_statement();
    PERFORM prepare_bm25_search_statement();

    RAISE NOTICE 'RAG session initialized with ef_search=%, jit=%',
        p_ef_search, p_enable_jit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION search_embeddings_quantized IS
    'Vector search using quantized halfvec index for 50% memory savings';
COMMENT ON FUNCTION configure_vector_search IS
    'Configure pgvector 0.8 search parameters including iterative scan';
COMMENT ON FUNCTION hybrid_search_optimized IS
    'Optimized hybrid search with quantized vectors, BM25, and RRF fusion';
COMMENT ON FUNCTION get_vector_index_stats IS
    'Get statistics for HNSW and IVFFlat vector indexes';
COMMENT ON FUNCTION get_search_performance_stats IS
    'Get RAG search performance metrics with recommendations';
COMMENT ON FUNCTION init_rag_session IS
    'Initialize database session with optimal RAG settings';
COMMENT ON INDEX ix_embeddings_hnsw_quantized IS
    'Quantized HNSW index using halfvec (2-byte floats) for 50% memory savings';

-- ============================================================================
-- 12. ANALYZE UPDATED TABLES
-- ============================================================================

ANALYZE note_embeddings;
ANALYZE notes;
ANALYZE chat_messages;
ANALYZE tool_calls;
ANALYZE rag_query_logs;

-- ============================================================================
-- COMPLETION REPORT
-- ============================================================================

DO $$
DECLARE
    v_quantized_exists BOOLEAN;
    v_index_size TEXT;
BEGIN
    SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'ix_embeddings_hnsw_quantized')
    INTO v_quantized_exists;

    IF v_quantized_exists THEN
        SELECT pg_size_pretty(pg_relation_size('ix_embeddings_hnsw_quantized'))
        INTO v_index_size;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Advanced Optimizations Applied Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Vector Quantization: %',
        CASE WHEN v_quantized_exists THEN 'Enabled (halfvec index: ' || v_index_size || ')'
        ELSE 'Skipped (pgvector < 0.7)' END;
    RAISE NOTICE '✓ Iterative Scan: Configured via configure_vector_search()';
    RAISE NOTICE '✓ FILLFACTOR: Tuned for tool_calls(80), chat_messages(85), notes(90)';
    RAISE NOTICE '✓ Index Deduplication: Enabled on user_id columns';
    RAISE NOTICE '✓ Hybrid Search: hybrid_search_optimized() function created';
    RAISE NOTICE '✓ Prepared Statements: Templates created';
    RAISE NOTICE '✓ Statistics: Targets increased for key columns';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '  -- Initialize session for RAG workload:';
    RAISE NOTICE '  SELECT init_rag_session(100, true);';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Run optimized hybrid search:';
    RAISE NOTICE '  SELECT * FROM hybrid_search_optimized(';
    RAISE NOTICE '    embedding_vector, ''search query'', ''user-id'', 10';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Check vector index stats:';
    RAISE NOTICE '  SELECT * FROM get_vector_index_stats();';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Check search performance:';
    RAISE NOTICE '  SELECT * FROM get_search_performance_stats();';
    RAISE NOTICE '============================================';
END $$;
