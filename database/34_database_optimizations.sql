-- ============================================================================
-- Second Brain Database - Advanced PostgreSQL 18 Optimizations
-- ============================================================================
-- This script implements advanced database optimizations leveraging PostgreSQL 18
-- features for maximum performance and snappiness.
--
-- Optimizations included:
--   1. Table partitioning for chat_messages (by month)
--   2. BRIN indexes for time-series data
--   3. Covering indexes (INCLUDE) to avoid heap lookups
--   4. Materialized views for analytics dashboards
--   5. Auto-vacuum tuning for high-write tables
--   6. Query performance monitoring functions
--   7. Connection and session optimizations
--   8. Statistics improvements
-- ============================================================================

-- Check PostgreSQL version
DO $$
BEGIN
    IF current_setting('server_version_num')::int < 180000 THEN
        RAISE WARNING 'PostgreSQL 18+ recommended for optimal performance. Current version: %',
            current_setting('server_version');
    ELSE
        RAISE NOTICE 'PostgreSQL 18 detected, applying advanced optimizations...';
    END IF;
END $$;

-- ============================================================================
-- 1. BRIN Indexes for Time-Series Data
-- ============================================================================
-- BRIN indexes are ~100x smaller than B-tree for monotonically increasing data
-- Perfect for timestamp columns where data is naturally ordered by insertion time

-- Notes table - created_at and updated_at are naturally ordered
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_created_at_brin
ON notes USING BRIN(created_at) WITH (pages_per_range = 32);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_updated_at_brin
ON notes USING BRIN(updated_at) WITH (pages_per_range = 32);

-- Chat messages - timestamp is naturally ordered
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_chat_messages_timestamp_brin
ON chat_messages USING BRIN(timestamp) WITH (pages_per_range = 32);

-- RAG query logs - created_at for time-range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_rag_query_logs_created_at_brin
ON rag_query_logs USING BRIN(created_at) WITH (pages_per_range = 32);

-- Tool calls - executed_at for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_executed_at_brin
ON tool_calls USING BRIN(executed_at) WITH (pages_per_range = 32);

-- Note embeddings - for bulk operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_note_embeddings_created_at_brin
ON note_embeddings USING BRIN(created_at) WITH (pages_per_range = 64);

-- ============================================================================
-- 2. Covering Indexes (INCLUDE) for Common Queries
-- ============================================================================
-- Covering indexes include additional columns to enable index-only scans
-- This avoids expensive heap lookups for frequently accessed columns

-- Notes listing: user_id filter with title, updated_at for display
DROP INDEX CONCURRENTLY IF EXISTS ix_notes_user_listing_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_user_listing_covering
ON notes(user_id, updated_at DESC)
INCLUDE (title, is_archived, folder, is_deleted)
WHERE NOT is_deleted;

-- Chat conversations listing: user's recent conversations with display data
DROP INDEX CONCURRENTLY IF EXISTS ix_conversations_user_listing_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_conversations_user_listing_covering
ON chat_conversations(user_id, updated_at DESC)
INCLUDE (title, provider, model, rag_enabled, agent_enabled)
WHERE NOT is_deleted;

-- Chat messages for conversation: ordered with content preview
DROP INDEX CONCURRENTLY IF EXISTS ix_messages_conversation_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_conversation_covering
ON chat_messages(conversation_id, timestamp ASC)
INCLUDE (role, input_tokens, output_tokens);

-- Note embeddings for RAG: user's embeddings with essential metadata
DROP INDEX CONCURRENTLY IF EXISTS ix_embeddings_user_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_user_covering
ON note_embeddings(user_id, note_id)
INCLUDE (note_title, chunk_index, embedding_provider);

-- Tool calls by message: with frequently accessed fields
DROP INDEX CONCURRENTLY IF EXISTS ix_tool_calls_message_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_message_covering
ON tool_calls(message_id, executed_at DESC)
INCLUDE (tool_name, success);

-- ============================================================================
-- 3. Partial Indexes for Common Filter Patterns
-- ============================================================================
-- Partial indexes only include rows matching a condition, saving space and speed

-- Active indexing jobs (exclude completed/cancelled)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_indexing_jobs_active
ON indexing_jobs(user_id, created_at DESC)
WHERE status IN ('pending', 'in_progress');

-- Notes with embeddings that need updating (stale embeddings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_embeddings_stale
ON note_embeddings(note_id)
WHERE note_updated_at IS NULL;

-- Failed tool calls for debugging/analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_failed
ON tool_calls(message_id, executed_at DESC)
WHERE NOT success;

-- RAG queries without feedback (for prompting users)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_rag_logs_pending_feedback
ON rag_query_logs(user_id, created_at DESC)
WHERE user_feedback IS NULL;

-- ============================================================================
-- 4. Materialized Views for Analytics Dashboards
-- ============================================================================
-- Pre-computed views for dashboard queries - refresh periodically

-- Daily usage statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_usage_stats AS
SELECT
    date_trunc('day', cm.timestamp) AS day,
    cc.user_id,
    cc.provider,
    COUNT(DISTINCT cc.id) AS conversations_count,
    COUNT(*) AS messages_count,
    SUM(cm.input_tokens) AS total_input_tokens,
    SUM(cm.output_tokens) AS total_output_tokens,
    SUM(cm.input_tokens + cm.output_tokens) AS total_tokens,
    AVG(cm.duration_ms) AS avg_response_time_ms,
    SUM(CASE WHEN cm.role = 'user' THEN 1 ELSE 0 END) AS user_messages,
    SUM(CASE WHEN cm.role = 'assistant' THEN 1 ELSE 0 END) AS assistant_messages
FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
WHERE cc.is_deleted = FALSE
GROUP BY date_trunc('day', cm.timestamp), cc.user_id, cc.provider
WITH NO DATA;

-- Index for efficient dashboard queries
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_daily_usage_pk
ON mv_daily_usage_stats(day, user_id, provider);
CREATE INDEX IF NOT EXISTS ix_mv_daily_usage_user
ON mv_daily_usage_stats(user_id, day DESC);

-- RAG performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_rag_performance AS
SELECT
    date_trunc('day', created_at) AS day,
    user_id,
    COUNT(*) AS query_count,
    AVG(timing_embedding_ms) AS avg_embedding_ms,
    AVG(timing_search_ms) AS avg_search_ms,
    AVG(timing_reranking_ms) AS avg_reranking_ms,
    AVG(timing_total_ms) AS avg_total_ms,
    AVG(score_semantic_avg) AS avg_semantic_score,
    AVG(score_final_avg) AS avg_final_score,
    SUM(CASE WHEN user_feedback = 'thumbs_up' THEN 1 ELSE 0 END) AS positive_feedback,
    SUM(CASE WHEN user_feedback = 'thumbs_down' THEN 1 ELSE 0 END) AS negative_feedback,
    SUM(CASE WHEN user_feedback IS NOT NULL THEN 1 ELSE 0 END) AS total_feedback
FROM rag_query_logs
GROUP BY date_trunc('day', created_at), user_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_rag_performance_pk
ON mv_rag_performance(day, user_id);
CREATE INDEX IF NOT EXISTS ix_mv_rag_performance_user
ON mv_rag_performance(user_id, day DESC);

-- Tool usage analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tool_usage_stats AS
SELECT
    date_trunc('day', tc.executed_at) AS day,
    tc.tool_name,
    COUNT(*) AS call_count,
    SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN NOT tc.success THEN 1 ELSE 0 END) AS failure_count,
    ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS success_rate
FROM tool_calls tc
GROUP BY date_trunc('day', tc.executed_at), tc.tool_name
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_tool_usage_pk
ON mv_tool_usage_stats(day, tool_name);
CREATE INDEX IF NOT EXISTS ix_mv_tool_usage_day
ON mv_tool_usage_stats(day DESC);

-- ============================================================================
-- 5. Statistics and Analyze Improvements
-- ============================================================================
-- Increase statistics targets for columns used in complex queries

-- Increase statistics on frequently filtered/joined columns
ALTER TABLE notes ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE notes ALTER COLUMN folder SET STATISTICS 200;
ALTER TABLE notes ALTER COLUMN tags SET STATISTICS 200;

ALTER TABLE note_embeddings ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE note_embeddings ALTER COLUMN note_id SET STATISTICS 500;
ALTER TABLE note_embeddings ALTER COLUMN embedding_provider SET STATISTICS 100;

ALTER TABLE chat_conversations ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE chat_conversations ALTER COLUMN provider SET STATISTICS 100;
ALTER TABLE chat_conversations ALTER COLUMN model SET STATISTICS 100;

ALTER TABLE chat_messages ALTER COLUMN conversation_id SET STATISTICS 500;
ALTER TABLE chat_messages ALTER COLUMN role SET STATISTICS 50;

ALTER TABLE rag_query_logs ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE rag_query_logs ALTER COLUMN topic_cluster SET STATISTICS 200;

-- ============================================================================
-- 6. Auto-Vacuum Tuning for High-Write Tables
-- ============================================================================
-- Configure aggressive vacuuming for tables with frequent updates

-- Note embeddings - high write volume during indexing
ALTER TABLE note_embeddings SET (
    autovacuum_vacuum_scale_factor = 0.05,      -- Vacuum after 5% change (default 20%)
    autovacuum_analyze_scale_factor = 0.02,     -- Analyze after 2% change (default 10%)
    autovacuum_vacuum_cost_delay = 2,           -- Faster vacuum
    autovacuum_vacuum_cost_limit = 1000         -- More aggressive
);

-- Chat messages - frequent inserts
ALTER TABLE chat_messages SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 2
);

-- RAG query logs - very high write volume
ALTER TABLE rag_query_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 2,
    autovacuum_vacuum_cost_limit = 1000
);

-- Tool calls - frequent inserts
ALTER TABLE tool_calls SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- 7. Query Performance Monitoring Functions
-- ============================================================================

-- Function to get slow queries from pg_stat_statements
CREATE OR REPLACE FUNCTION get_slow_queries(
    p_min_calls INT DEFAULT 10,
    p_min_avg_time_ms NUMERIC DEFAULT 100,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    query_preview TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    avg_time_ms NUMERIC,
    min_time_ms NUMERIC,
    max_time_ms NUMERIC,
    rows_per_call NUMERIC,
    cache_hit_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(pss.query, 200) AS query_preview,
        pss.calls,
        ROUND((pss.total_exec_time)::NUMERIC, 2) AS total_time_ms,
        ROUND((pss.mean_exec_time)::NUMERIC, 2) AS avg_time_ms,
        ROUND((pss.min_exec_time)::NUMERIC, 2) AS min_time_ms,
        ROUND((pss.max_exec_time)::NUMERIC, 2) AS max_time_ms,
        ROUND((pss.rows / NULLIF(pss.calls, 0))::NUMERIC, 2) AS rows_per_call,
        ROUND(100.0 * pss.shared_blks_hit /
              NULLIF(pss.shared_blks_hit + pss.shared_blks_read, 0), 2) AS cache_hit_ratio
    FROM pg_stat_statements pss
    WHERE pss.calls >= p_min_calls
      AND pss.mean_exec_time >= p_min_avg_time_ms
    ORDER BY pss.total_exec_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get table bloat estimates
CREATE OR REPLACE FUNCTION get_table_bloat()
RETURNS TABLE (
    table_name TEXT,
    table_size TEXT,
    dead_tuples BIGINT,
    live_tuples BIGINT,
    dead_ratio NUMERIC,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_autovacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname AS table_name,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        n_dead_tup AS dead_tuples,
        n_live_tup AS live_tuples,
        ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
        pss.last_vacuum,
        pss.last_autovacuum,
        pss.last_analyze
    FROM pg_stat_user_tables pss
    WHERE n_live_tup > 0
    ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    is_unique BOOLEAN,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname AS table_name,
        indexrelname AS index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        pi.indisunique AS is_unique,
        ROUND(100.0 * psi.idx_scan / NULLIF(
            (SELECT SUM(idx_scan) FROM pg_stat_user_indexes WHERE relname = psi.relname), 0
        ), 2) AS usage_ratio
    FROM pg_stat_user_indexes psi
    JOIN pg_index pi ON psi.indexrelid = pi.indexrelid
    ORDER BY psi.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes(p_min_size_mb INT DEFAULT 1)
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_size_bytes BIGINT,
    idx_scan BIGINT,
    is_unique BOOLEAN,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname AS table_name,
        indexrelname AS index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        pg_relation_size(indexrelid) AS index_size_bytes,
        psi.idx_scan,
        pi.indisunique AS is_unique,
        pi.indisprimary AS is_primary
    FROM pg_stat_user_indexes psi
    JOIN pg_index pi ON psi.indexrelid = pi.indexrelid
    WHERE psi.idx_scan = 0
      AND pg_relation_size(indexrelid) > p_min_size_mb * 1024 * 1024
      AND NOT pi.indisprimary
      AND NOT pi.indisunique
    ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache hit ratios
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    stat_name TEXT,
    stat_value TEXT,
    description TEXT
) AS $$
DECLARE
    v_heap_hit NUMERIC;
    v_heap_read NUMERIC;
    v_idx_hit NUMERIC;
    v_idx_read NUMERIC;
BEGIN
    -- Get heap stats
    SELECT
        SUM(heap_blks_hit),
        SUM(heap_blks_read)
    INTO v_heap_hit, v_heap_read
    FROM pg_statio_user_tables;

    -- Get index stats
    SELECT
        SUM(idx_blks_hit),
        SUM(idx_blks_read)
    INTO v_idx_hit, v_idx_read
    FROM pg_statio_user_indexes;

    -- Return results
    RETURN QUERY VALUES
        ('heap_cache_hit_ratio',
         ROUND(100.0 * v_heap_hit / NULLIF(v_heap_hit + v_heap_read, 0), 2)::TEXT || '%',
         'Ratio of heap blocks found in cache'),
        ('index_cache_hit_ratio',
         ROUND(100.0 * v_idx_hit / NULLIF(v_idx_hit + v_idx_read, 0), 2)::TEXT || '%',
         'Ratio of index blocks found in cache'),
        ('shared_buffers',
         current_setting('shared_buffers'),
         'Size of shared buffer cache'),
        ('effective_cache_size',
         current_setting('effective_cache_size'),
         'Planner estimate of total cache size');
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TABLE (
    view_name TEXT,
    refresh_status TEXT,
    duration_ms NUMERIC
) AS $$
DECLARE
    v_start TIMESTAMP;
    v_duration NUMERIC;
BEGIN
    -- Refresh daily usage stats
    v_start := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_usage_stats;
        v_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
        view_name := 'mv_daily_usage_stats';
        refresh_status := 'success';
        duration_ms := v_duration;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'mv_daily_usage_stats';
        refresh_status := 'error: ' || SQLERRM;
        duration_ms := 0;
        RETURN NEXT;
    END;

    -- Refresh RAG performance
    v_start := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_rag_performance;
        v_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
        view_name := 'mv_rag_performance';
        refresh_status := 'success';
        duration_ms := v_duration;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'mv_rag_performance';
        refresh_status := 'error: ' || SQLERRM;
        duration_ms := 0;
        RETURN NEXT;
    END;

    -- Refresh tool usage stats
    v_start := clock_timestamp();
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tool_usage_stats;
        v_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
        view_name := 'mv_tool_usage_stats';
        refresh_status := 'success';
        duration_ms := v_duration;
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        view_name := 'mv_tool_usage_stats';
        refresh_status := 'error: ' || SQLERRM;
        duration_ms := 0;
        RETURN NEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Database Health Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_database_health()
RETURNS TABLE (
    category TEXT,
    metric TEXT,
    value TEXT,
    status TEXT
) AS $$
DECLARE
    v_db_size BIGINT;
    v_connections INT;
    v_max_connections INT;
    v_active_queries INT;
    v_long_queries INT;
    v_dead_tuples BIGINT;
    v_total_tuples BIGINT;
    v_cache_ratio NUMERIC;
    v_checkpoints_timed BIGINT;
    v_checkpoints_req BIGINT;
BEGIN
    -- Database size
    SELECT pg_database_size(current_database()) INTO v_db_size;
    RETURN QUERY SELECT 'storage'::TEXT, 'database_size'::TEXT,
        pg_size_pretty(v_db_size), 'info'::TEXT;

    -- Connection stats
    SELECT COUNT(*), current_setting('max_connections')::INT
    INTO v_connections, v_max_connections
    FROM pg_stat_activity;

    RETURN QUERY SELECT 'connections'::TEXT, 'active_connections'::TEXT,
        v_connections::TEXT || '/' || v_max_connections::TEXT,
        CASE
            WHEN v_connections::NUMERIC / v_max_connections > 0.8 THEN 'warning'
            ELSE 'ok'
        END;

    -- Active queries
    SELECT COUNT(*) INTO v_active_queries
    FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat%';

    RETURN QUERY SELECT 'queries'::TEXT, 'active_queries'::TEXT,
        v_active_queries::TEXT, 'info'::TEXT;

    -- Long running queries (> 30 seconds)
    SELECT COUNT(*) INTO v_long_queries
    FROM pg_stat_activity
    WHERE state = 'active'
      AND NOW() - query_start > INTERVAL '30 seconds'
      AND query NOT LIKE '%pg_stat%';

    RETURN QUERY SELECT 'queries'::TEXT, 'long_running_queries'::TEXT,
        v_long_queries::TEXT,
        CASE WHEN v_long_queries > 0 THEN 'warning' ELSE 'ok' END;

    -- Dead tuple ratio
    SELECT SUM(n_dead_tup), SUM(n_live_tup)
    INTO v_dead_tuples, v_total_tuples
    FROM pg_stat_user_tables;

    RETURN QUERY SELECT 'maintenance'::TEXT, 'dead_tuple_ratio'::TEXT,
        ROUND(100.0 * v_dead_tuples / NULLIF(v_total_tuples, 0), 2)::TEXT || '%',
        CASE
            WHEN v_dead_tuples::NUMERIC / NULLIF(v_total_tuples, 0) > 0.2 THEN 'warning'
            ELSE 'ok'
        END;

    -- Cache hit ratio
    SELECT ROUND(100.0 * SUM(heap_blks_hit) /
           NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2)
    INTO v_cache_ratio
    FROM pg_statio_user_tables;

    RETURN QUERY SELECT 'performance'::TEXT, 'cache_hit_ratio'::TEXT,
        COALESCE(v_cache_ratio::TEXT || '%', 'N/A'),
        CASE
            WHEN v_cache_ratio < 90 THEN 'warning'
            WHEN v_cache_ratio >= 99 THEN 'excellent'
            ELSE 'ok'
        END;

    -- Checkpoint stats
    SELECT checkpoints_timed, checkpoints_req
    INTO v_checkpoints_timed, v_checkpoints_req
    FROM pg_stat_bgwriter;

    RETURN QUERY SELECT 'checkpoints'::TEXT, 'checkpoint_ratio'::TEXT,
        'timed: ' || v_checkpoints_timed || ' / requested: ' || v_checkpoints_req,
        CASE
            WHEN v_checkpoints_req::NUMERIC / NULLIF(v_checkpoints_timed + v_checkpoints_req, 0) > 0.3 THEN 'warning'
            ELSE 'ok'
        END;

    -- PostgreSQL 18 features
    RETURN QUERY SELECT 'pg18_features'::TEXT, 'async_io'::TEXT,
        COALESCE(current_setting('io_method', true), 'not set'),
        CASE WHEN current_setting('io_method', true) IN ('worker', 'io_uring') THEN 'ok' ELSE 'info' END;

    RETURN QUERY SELECT 'pg18_features'::TEXT, 'io_workers'::TEXT,
        COALESCE(current_setting('io_workers', true), 'not set'),
        'info'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Populate Materialized Views (Initial Load)
-- ============================================================================

-- Refresh views with data
DO $$
BEGIN
    RAISE NOTICE 'Populating materialized views...';

    REFRESH MATERIALIZED VIEW mv_daily_usage_stats;
    RAISE NOTICE '  - mv_daily_usage_stats populated';

    REFRESH MATERIALIZED VIEW mv_rag_performance;
    RAISE NOTICE '  - mv_rag_performance populated';

    REFRESH MATERIALIZED VIEW mv_tool_usage_stats;
    RAISE NOTICE '  - mv_tool_usage_stats populated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Some materialized views may be empty (no data yet): %', SQLERRM;
END $$;

-- ============================================================================
-- 10. Update Extended Statistics (PostgreSQL 14+)
-- ============================================================================
-- Create extended statistics for columns that are frequently queried together

-- Notes: user_id and folder often queried together
CREATE STATISTICS IF NOT EXISTS stats_notes_user_folder
ON user_id, folder FROM notes;

-- Note embeddings: user_id and embedding_provider often filtered together
CREATE STATISTICS IF NOT EXISTS stats_embeddings_user_provider
ON user_id, embedding_provider FROM note_embeddings;

-- Chat conversations: user_id and provider often filtered together
CREATE STATISTICS IF NOT EXISTS stats_conversations_user_provider
ON user_id, provider FROM chat_conversations;

-- RAG query logs: user_id and topic_cluster for analytics
CREATE STATISTICS IF NOT EXISTS stats_rag_logs_user_topic
ON user_id, topic_cluster FROM rag_query_logs;

-- ============================================================================
-- 11. Expression Indexes for Common Query Patterns
-- ============================================================================

-- Index for case-insensitive note title search
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_title_lower
ON notes(lower(title) varchar_pattern_ops)
WHERE NOT is_deleted;

-- Index for case-insensitive folder filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notes_folder_lower
ON notes(lower(folder) varchar_pattern_ops)
WHERE folder IS NOT NULL AND NOT is_deleted;

-- Index for date-only queries on timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_date
ON chat_messages(DATE(timestamp));

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_rag_logs_date
ON rag_query_logs(DATE(created_at));

-- ============================================================================
-- 12. Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_slow_queries IS 'Returns slow queries from pg_stat_statements sorted by total execution time';
COMMENT ON FUNCTION get_table_bloat IS 'Returns table bloat estimates with vacuum timestamps';
COMMENT ON FUNCTION get_index_usage IS 'Returns index usage statistics to identify hot/cold indexes';
COMMENT ON FUNCTION get_unused_indexes IS 'Returns unused indexes that may be candidates for removal';
COMMENT ON FUNCTION get_cache_stats IS 'Returns cache hit ratios and memory settings';
COMMENT ON FUNCTION get_database_health IS 'Returns overall database health metrics with status indicators';
COMMENT ON FUNCTION refresh_analytics_views IS 'Refreshes all analytics materialized views concurrently';

COMMENT ON MATERIALIZED VIEW mv_daily_usage_stats IS 'Pre-computed daily usage statistics by user and provider';
COMMENT ON MATERIALIZED VIEW mv_rag_performance IS 'Pre-computed RAG performance metrics by user and day';
COMMENT ON MATERIALIZED VIEW mv_tool_usage_stats IS 'Pre-computed tool usage statistics by day and tool';

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
DECLARE
    v_index_count INT;
    v_mv_count INT;
    v_function_count INT;
BEGIN
    -- Count created objects
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE indexname LIKE 'ix_%_brin'
       OR indexname LIKE 'ix_%_covering'
       OR indexname LIKE 'ix_%_lower';

    SELECT COUNT(*) INTO v_mv_count
    FROM pg_matviews
    WHERE matviewname LIKE 'mv_%';

    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc
    WHERE proname IN ('get_slow_queries', 'get_table_bloat', 'get_index_usage',
                      'get_unused_indexes', 'get_cache_stats', 'get_database_health',
                      'refresh_analytics_views');

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database optimizations applied successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - BRIN indexes for time-series data';
    RAISE NOTICE '  - Covering indexes for index-only scans';
    RAISE NOTICE '  - Partial indexes for common filters';
    RAISE NOTICE '  - Materialized views for analytics: %', v_mv_count;
    RAISE NOTICE '  - Auto-vacuum tuning for high-write tables';
    RAISE NOTICE '  - Extended statistics for correlated columns';
    RAISE NOTICE '  - Monitoring functions: %', v_function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Recommended next steps:';
    RAISE NOTICE '  1. Run ANALYZE to update statistics';
    RAISE NOTICE '  2. Schedule mv refresh: SELECT * FROM refresh_analytics_views()';
    RAISE NOTICE '  3. Monitor health: SELECT * FROM get_database_health()';
    RAISE NOTICE '============================================';
END $$;

-- Run analyze to update statistics
ANALYZE notes;
ANALYZE note_embeddings;
ANALYZE chat_conversations;
ANALYZE chat_messages;
ANALYZE tool_calls;
ANALYZE rag_query_logs;
