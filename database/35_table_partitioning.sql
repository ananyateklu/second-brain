-- ============================================================================
-- Second Brain Database - Table Partitioning for High-Volume Tables
-- ============================================================================
-- This script implements range partitioning for time-series tables to improve:
--   1. Query performance (partition pruning)
--   2. Maintenance operations (vacuum/analyze per partition)
--   3. Data lifecycle management (drop old partitions)
--   4. Parallel query execution (scan multiple partitions concurrently)
--
-- Tables partitioned:
--   - chat_messages_partitioned (by month on timestamp)
--   - rag_query_logs_partitioned (by month on created_at)
--
-- Note: This creates NEW partitioned tables. Migration of existing data
-- is handled separately to minimize downtime.
-- ============================================================================

-- Check PostgreSQL version
DO $$
BEGIN
    IF current_setting('server_version_num')::int < 140000 THEN
        RAISE EXCEPTION 'PostgreSQL 14+ required for enhanced partitioning. Current: %',
            current_setting('server_version');
    END IF;
    RAISE NOTICE 'Creating partitioned tables...';
END $$;

-- ============================================================================
-- 1. Partitioned Chat Messages Table
-- ============================================================================
-- Partitioned by month on timestamp for efficient time-range queries

-- Create partitioned version of chat_messages
CREATE TABLE IF NOT EXISTS chat_messages_partitioned (
    id TEXT NOT NULL,
    conversation_id VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    input_tokens INTEGER,
    output_tokens INTEGER,
    duration_ms DOUBLE PRECISION,
    rag_log_id VARCHAR(128),
    rag_feedback VARCHAR(20),
    -- Token tracking columns
    tokens_actual BOOLEAN DEFAULT NULL,
    reasoning_tokens INTEGER DEFAULT NULL,
    cache_creation_tokens INTEGER DEFAULT NULL,
    cache_read_tokens INTEGER DEFAULT NULL,
    rag_context_tokens INTEGER DEFAULT NULL,
    rag_chunks_count INTEGER DEFAULT NULL,
    tool_definition_tokens INTEGER DEFAULT NULL,
    tool_argument_tokens INTEGER DEFAULT NULL,
    tool_result_tokens INTEGER DEFAULT NULL,
    -- UUIDv7 column
    uuid_v7 UUID DEFAULT uuidv7(),
    -- Primary key includes partition key for efficiency
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create default partition for data outside defined ranges
CREATE TABLE IF NOT EXISTS chat_messages_default
PARTITION OF chat_messages_partitioned DEFAULT;

-- Create function to auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_chat_messages_partition(
    p_year INT,
    p_month INT
)
RETURNS TEXT AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_partition_name := 'chat_messages_y' || p_year || 'm' || LPAD(p_month::TEXT, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';

    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = v_partition_name
    ) THEN
        RETURN v_partition_name || ' already exists';
    END IF;

    -- Create partition
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF chat_messages_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        v_start_date,
        v_end_date
    );

    -- Create indexes on partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (conversation_id, timestamp)',
        'ix_' || v_partition_name || '_conv_ts',
        v_partition_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (timestamp)',
        'ix_' || v_partition_name || '_ts',
        v_partition_name
    );

    RETURN v_partition_name || ' created';
END;
$$ LANGUAGE plpgsql;

-- Create partitions for current year and next 3 months
DO $$
DECLARE
    v_year INT;
    v_month INT;
    v_current_date DATE := CURRENT_DATE;
    v_result TEXT;
BEGIN
    -- Create partitions from start of current year to 3 months ahead
    FOR v_year IN EXTRACT(YEAR FROM v_current_date)::INT .. EXTRACT(YEAR FROM v_current_date + INTERVAL '3 months')::INT LOOP
        FOR v_month IN 1..12 LOOP
            -- Skip if before current year's January or after 3 months from now
            IF make_date(v_year, v_month, 1) < date_trunc('year', v_current_date) THEN
                CONTINUE;
            END IF;
            IF make_date(v_year, v_month, 1) > v_current_date + INTERVAL '3 months' THEN
                EXIT;
            END IF;

            SELECT create_chat_messages_partition(v_year, v_month) INTO v_result;
            RAISE NOTICE 'Chat messages partition: %', v_result;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 2. Partitioned RAG Query Logs Table
-- ============================================================================
-- Partitioned by month on created_at for efficient analytics queries

CREATE TABLE IF NOT EXISTS rag_query_logs_partitioned (
    id TEXT NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    query TEXT NOT NULL,
    query_embedding_preview TEXT,
    -- Timing metrics
    timing_embedding_ms DOUBLE PRECISION,
    timing_search_ms DOUBLE PRECISION,
    timing_reranking_ms DOUBLE PRECISION,
    timing_total_ms DOUBLE PRECISION,
    -- Score metrics
    score_semantic_avg DOUBLE PRECISION,
    score_semantic_max DOUBLE PRECISION,
    score_bm25_avg DOUBLE PRECISION,
    score_final_avg DOUBLE PRECISION,
    -- Results metadata
    results_count INTEGER,
    results_note_ids TEXT[],
    -- User feedback
    user_feedback VARCHAR(20),
    feedback_text TEXT,
    -- Analytics
    conversation_id VARCHAR(128),
    topic_cluster VARCHAR(50),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- UUIDv7 column
    uuid_v7 UUID DEFAULT uuidv7(),
    -- Primary key includes partition key
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create default partition
CREATE TABLE IF NOT EXISTS rag_query_logs_default
PARTITION OF rag_query_logs_partitioned DEFAULT;

-- Create function to auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_rag_logs_partition(
    p_year INT,
    p_month INT
)
RETURNS TEXT AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_partition_name := 'rag_query_logs_y' || p_year || 'm' || LPAD(p_month::TEXT, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';

    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = v_partition_name
    ) THEN
        RETURN v_partition_name || ' already exists';
    END IF;

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF rag_query_logs_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        v_start_date,
        v_end_date
    );

    -- Create indexes on partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (user_id, created_at DESC)',
        'ix_' || v_partition_name || '_user_created',
        v_partition_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (topic_cluster) WHERE topic_cluster IS NOT NULL',
        'ix_' || v_partition_name || '_topic',
        v_partition_name
    );

    RETURN v_partition_name || ' created';
END;
$$ LANGUAGE plpgsql;

-- Create partitions for current year and next 3 months
DO $$
DECLARE
    v_year INT;
    v_month INT;
    v_current_date DATE := CURRENT_DATE;
    v_result TEXT;
BEGIN
    FOR v_year IN EXTRACT(YEAR FROM v_current_date)::INT .. EXTRACT(YEAR FROM v_current_date + INTERVAL '3 months')::INT LOOP
        FOR v_month IN 1..12 LOOP
            IF make_date(v_year, v_month, 1) < date_trunc('year', v_current_date) THEN
                CONTINUE;
            END IF;
            IF make_date(v_year, v_month, 1) > v_current_date + INTERVAL '3 months' THEN
                EXIT;
            END IF;

            SELECT create_rag_logs_partition(v_year, v_month) INTO v_result;
            RAISE NOTICE 'RAG logs partition: %', v_result;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 3. Partition Management Functions
-- ============================================================================

-- Function to ensure partitions exist for upcoming months
CREATE OR REPLACE FUNCTION ensure_future_partitions(p_months_ahead INT DEFAULT 3)
RETURNS TABLE (
    table_name TEXT,
    partition_name TEXT,
    action TEXT
) AS $$
DECLARE
    v_date DATE;
    v_year INT;
    v_month INT;
    v_result TEXT;
BEGIN
    FOR v_date IN
        SELECT generate_series(
            date_trunc('month', CURRENT_DATE),
            date_trunc('month', CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL),
            '1 month'
        )::DATE
    LOOP
        v_year := EXTRACT(YEAR FROM v_date)::INT;
        v_month := EXTRACT(MONTH FROM v_date)::INT;

        -- Create chat messages partition
        SELECT create_chat_messages_partition(v_year, v_month) INTO v_result;
        table_name := 'chat_messages_partitioned';
        partition_name := 'chat_messages_y' || v_year || 'm' || LPAD(v_month::TEXT, 2, '0');
        action := v_result;
        RETURN NEXT;

        -- Create RAG logs partition
        SELECT create_rag_logs_partition(v_year, v_month) INTO v_result;
        table_name := 'rag_query_logs_partitioned';
        partition_name := 'rag_query_logs_y' || v_year || 'm' || LPAD(v_month::TEXT, 2, '0');
        action := v_result;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to archive/drop old partitions
CREATE OR REPLACE FUNCTION archive_old_partitions(
    p_table_prefix TEXT,
    p_months_to_keep INT DEFAULT 12
)
RETURNS TABLE (
    partition_name TEXT,
    action TEXT,
    rows_affected BIGINT
) AS $$
DECLARE
    v_partition RECORD;
    v_cutoff_date DATE;
    v_count BIGINT;
BEGIN
    v_cutoff_date := date_trunc('month', CURRENT_DATE - (p_months_to_keep || ' months')::INTERVAL);

    FOR v_partition IN
        SELECT
            c.relname AS partition_name,
            pg_get_expr(c.relpartbound, c.oid) AS partition_bound
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON i.inhparent = p.oid
        WHERE p.relname = p_table_prefix || '_partitioned'
          AND c.relname LIKE p_table_prefix || '_y%'
    LOOP
        -- Check if this partition is older than cutoff
        -- Parse partition name to get date (format: prefix_yYYYYmMM)
        DECLARE
            v_year INT;
            v_month INT;
            v_partition_date DATE;
        BEGIN
            v_year := SUBSTRING(v_partition.partition_name FROM 'y(\d{4})')::INT;
            v_month := SUBSTRING(v_partition.partition_name FROM 'm(\d{2})')::INT;
            v_partition_date := make_date(v_year, v_month, 1);

            IF v_partition_date < v_cutoff_date THEN
                -- Get row count before detaching
                EXECUTE format('SELECT COUNT(*) FROM %I', v_partition.partition_name) INTO v_count;

                -- Option 1: Detach partition (keeps data, removes from partitioned table)
                EXECUTE format(
                    'ALTER TABLE %I DETACH PARTITION %I',
                    p_table_prefix || '_partitioned',
                    v_partition.partition_name
                );

                partition_name := v_partition.partition_name;
                action := 'detached';
                rows_affected := v_count;
                RETURN NEXT;

                -- Option 2: Drop partition (uncomment to delete data)
                -- EXECUTE format('DROP TABLE %I', v_partition.partition_name);
                -- action := 'dropped';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            partition_name := v_partition.partition_name;
            action := 'error: ' || SQLERRM;
            rows_affected := 0;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get partition statistics
CREATE OR REPLACE FUNCTION get_partition_stats(p_table_name TEXT)
RETURNS TABLE (
    partition_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT,
    date_range TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_info AS (
        SELECT
            c.relname AS pname,
            pg_get_expr(c.relpartbound, c.oid) AS pbound
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON i.inhparent = p.oid
        WHERE p.relname = p_table_name
    )
    SELECT
        pi.pname,
        (SELECT reltuples::BIGINT FROM pg_class WHERE relname = pi.pname),
        pg_size_pretty(pg_relation_size(pi.pname::regclass)),
        pg_size_pretty(pg_indexes_size(pi.pname::regclass)),
        pg_size_pretty(pg_total_relation_size(pi.pname::regclass)),
        pi.pbound
    FROM partition_info pi
    ORDER BY pi.pname;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Data Migration Functions (Run manually after review)
-- ============================================================================

-- Function to migrate data from original table to partitioned table
-- Run this during a maintenance window
CREATE OR REPLACE FUNCTION migrate_to_partitioned_chat_messages(
    p_batch_size INT DEFAULT 10000,
    p_max_batches INT DEFAULT NULL
)
RETURNS TABLE (
    batch_number INT,
    rows_migrated INT,
    duration_ms NUMERIC
) AS $$
DECLARE
    v_batch INT := 0;
    v_count INT;
    v_start TIMESTAMP;
    v_last_id TEXT := '';
BEGIN
    LOOP
        v_batch := v_batch + 1;
        v_start := clock_timestamp();

        -- Insert batch into partitioned table
        WITH migrated AS (
            INSERT INTO chat_messages_partitioned
            SELECT
                id, conversation_id, role, content, timestamp,
                input_tokens, output_tokens, duration_ms, rag_log_id, rag_feedback,
                tokens_actual, reasoning_tokens, cache_creation_tokens, cache_read_tokens,
                rag_context_tokens, rag_chunks_count, tool_definition_tokens,
                tool_argument_tokens, tool_result_tokens, uuid_v7
            FROM chat_messages
            WHERE id > v_last_id
            ORDER BY id
            LIMIT p_batch_size
            ON CONFLICT (id, timestamp) DO NOTHING
            RETURNING id
        )
        SELECT COUNT(*), MAX(id) INTO v_count, v_last_id FROM migrated;

        -- No more rows to migrate
        IF v_count = 0 THEN
            EXIT;
        END IF;

        batch_number := v_batch;
        rows_migrated := v_count;
        duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
        RETURN NEXT;

        -- Check batch limit
        IF p_max_batches IS NOT NULL AND v_batch >= p_max_batches THEN
            EXIT;
        END IF;

        -- Small delay to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Similar function for RAG query logs
CREATE OR REPLACE FUNCTION migrate_to_partitioned_rag_logs(
    p_batch_size INT DEFAULT 10000,
    p_max_batches INT DEFAULT NULL
)
RETURNS TABLE (
    batch_number INT,
    rows_migrated INT,
    duration_ms NUMERIC
) AS $$
DECLARE
    v_batch INT := 0;
    v_count INT;
    v_start TIMESTAMP;
    v_last_id TEXT := '';
BEGIN
    LOOP
        v_batch := v_batch + 1;
        v_start := clock_timestamp();

        WITH migrated AS (
            INSERT INTO rag_query_logs_partitioned
            SELECT
                id, user_id, query, query_embedding_preview,
                timing_embedding_ms, timing_search_ms, timing_reranking_ms, timing_total_ms,
                score_semantic_avg, score_semantic_max, score_bm25_avg, score_final_avg,
                results_count, results_note_ids,
                user_feedback, feedback_text,
                conversation_id, topic_cluster, created_at, uuid_v7
            FROM rag_query_logs
            WHERE id > v_last_id
            ORDER BY id
            LIMIT p_batch_size
            ON CONFLICT (id, created_at) DO NOTHING
            RETURNING id
        )
        SELECT COUNT(*), MAX(id) INTO v_count, v_last_id FROM migrated;

        IF v_count = 0 THEN
            EXIT;
        END IF;

        batch_number := v_batch;
        rows_migrated := v_count;
        duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
        RETURN NEXT;

        IF p_max_batches IS NOT NULL AND v_batch >= p_max_batches THEN
            EXIT;
        END IF;

        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Views to Unify Partitioned and Non-Partitioned Access
-- ============================================================================
-- These views allow gradual migration while maintaining backwards compatibility

-- View that combines both tables (useful during migration)
CREATE OR REPLACE VIEW v_all_chat_messages AS
SELECT * FROM chat_messages
UNION ALL
SELECT
    id, conversation_id, role, content, timestamp,
    input_tokens, output_tokens, duration_ms, rag_log_id, rag_feedback,
    tokens_actual, reasoning_tokens, cache_creation_tokens, cache_read_tokens,
    rag_context_tokens, rag_chunks_count, tool_definition_tokens,
    tool_argument_tokens, tool_result_tokens
FROM chat_messages_partitioned;

CREATE OR REPLACE VIEW v_all_rag_query_logs AS
SELECT * FROM rag_query_logs
UNION ALL
SELECT
    id, user_id, query, query_embedding_preview,
    timing_embedding_ms, timing_search_ms, timing_reranking_ms, timing_total_ms,
    score_semantic_avg, score_semantic_max, score_bm25_avg, score_final_avg,
    results_count, results_note_ids,
    user_feedback, feedback_text,
    conversation_id, topic_cluster, created_at
FROM rag_query_logs_partitioned;

-- ============================================================================
-- 6. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE chat_messages_partitioned IS 'Partitioned version of chat_messages by month on timestamp';
COMMENT ON TABLE rag_query_logs_partitioned IS 'Partitioned version of rag_query_logs by month on created_at';

COMMENT ON FUNCTION create_chat_messages_partition IS 'Creates a monthly partition for chat_messages_partitioned';
COMMENT ON FUNCTION create_rag_logs_partition IS 'Creates a monthly partition for rag_query_logs_partitioned';
COMMENT ON FUNCTION ensure_future_partitions IS 'Creates partitions for upcoming months (run monthly via cron)';
COMMENT ON FUNCTION archive_old_partitions IS 'Detaches partitions older than specified months';
COMMENT ON FUNCTION get_partition_stats IS 'Returns size and row count statistics for partitions';
COMMENT ON FUNCTION migrate_to_partitioned_chat_messages IS 'Migrates data from chat_messages to partitioned table in batches';
COMMENT ON FUNCTION migrate_to_partitioned_rag_logs IS 'Migrates data from rag_query_logs to partitioned table in batches';

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
DECLARE
    v_chat_partitions INT;
    v_rag_partitions INT;
BEGIN
    SELECT COUNT(*) INTO v_chat_partitions
    FROM pg_tables WHERE tablename LIKE 'chat_messages_y%';

    SELECT COUNT(*) INTO v_rag_partitions
    FROM pg_tables WHERE tablename LIKE 'rag_query_logs_y%';

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Table partitioning setup complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Partitioned tables created:';
    RAISE NOTICE '  - chat_messages_partitioned (% partitions)', v_chat_partitions;
    RAISE NOTICE '  - rag_query_logs_partitioned (% partitions)', v_rag_partitions;
    RAISE NOTICE '';
    RAISE NOTICE 'Migration commands (run manually):';
    RAISE NOTICE '  SELECT * FROM migrate_to_partitioned_chat_messages();';
    RAISE NOTICE '  SELECT * FROM migrate_to_partitioned_rag_logs();';
    RAISE NOTICE '';
    RAISE NOTICE 'Maintenance commands:';
    RAISE NOTICE '  SELECT * FROM ensure_future_partitions(3);';
    RAISE NOTICE '  SELECT * FROM get_partition_stats(''chat_messages_partitioned'');';
    RAISE NOTICE '  SELECT * FROM archive_old_partitions(''chat_messages'', 12);';
    RAISE NOTICE '============================================';
END $$;
