-- ============================================================================
-- Second Brain Database - Tool Call Analytics Functions (PostgreSQL 18)
-- ============================================================================
-- This script creates PostgreSQL functions for tool call analytics
-- using PostgreSQL 18's JSON_TABLE feature for efficient JSONB parsing.
-- 
-- Prerequisites:
--   - PostgreSQL 18 or higher
--   - Migration 13 (arguments_jsonb, result_jsonb columns) applied
-- ============================================================================

-- Verify PostgreSQL version
DO $$
BEGIN
    IF current_setting('server_version_num')::int < 180000 THEN
        RAISE EXCEPTION 'PostgreSQL 18 or higher required for JSON_TABLE. Current version: %', 
            current_setting('server_version');
    END IF;
    RAISE NOTICE 'PostgreSQL 18 detected, creating tool call analytics functions...';
END $$;

-- ============================================================================
-- 1. Function: Get Tool Usage By Action (JSON_TABLE)
-- ============================================================================
-- Uses JSON_TABLE to extract action from arguments_jsonb and aggregate stats

CREATE OR REPLACE FUNCTION get_tool_usage_by_action(
    p_user_id TEXT,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    tool_name TEXT,
    action TEXT,
    call_count INT,
    success_count INT,
    success_rate NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.tool_name::TEXT,
        COALESCE(jt.action, 'unknown')::TEXT AS action,
        COUNT(*)::INT AS call_count,
        SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::INT AS success_count,
        COALESCE(
            ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
            0
        )::NUMERIC(5,2) AS success_rate
    FROM tool_calls tc
    INNER JOIN chat_messages cm ON tc.message_id = cm.id
    INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
    JSON_TABLE(
        COALESCE(tc.arguments_jsonb, '{}'::jsonb),
        '$'
        COLUMNS (
            action TEXT PATH '$.action'
        )
    ) AS jt
    WHERE cc.user_id = p_user_id
      AND NOT cc.is_deleted
      AND (p_start_date IS NULL OR tc.executed_at >= p_start_date)
      AND (p_end_date IS NULL OR tc.executed_at <= p_end_date)
    GROUP BY tc.tool_name, jt.action
    ORDER BY tc.tool_name, call_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tool_usage_by_action IS 
    'Returns tool usage statistics grouped by action type, extracted from arguments JSONB using JSON_TABLE (PostgreSQL 18)';

-- ============================================================================
-- 2. Function: Get Tool Errors (JSON_TABLE)
-- ============================================================================
-- Uses JSON_TABLE to extract error details from result_jsonb

CREATE OR REPLACE FUNCTION get_tool_errors(
    p_user_id TEXT,
    p_top_n INT DEFAULT 10,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    tool_name TEXT,
    error_type TEXT,
    error_message TEXT,
    occurrence_count INT,
    first_occurrence TIMESTAMP WITH TIME ZONE,
    last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.tool_name::TEXT,
        COALESCE(jt.error_type, 'Unknown')::TEXT AS error_type,
        COALESCE(jt.error_message, LEFT(tc.result, 200))::TEXT AS error_message,
        COUNT(*)::INT AS occurrence_count,
        MIN(tc.executed_at) AS first_occurrence,
        MAX(tc.executed_at) AS last_occurrence
    FROM tool_calls tc
    INNER JOIN chat_messages cm ON tc.message_id = cm.id
    INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
    JSON_TABLE(
        COALESCE(tc.result_jsonb, '{}'::jsonb),
        '$'
        COLUMNS (
            error_type TEXT PATH '$.errorType',
            error_message TEXT PATH '$.error'
        )
    ) AS jt
    WHERE cc.user_id = p_user_id
      AND NOT cc.is_deleted
      AND NOT tc.success
      AND (p_start_date IS NULL OR tc.executed_at >= p_start_date)
      AND (p_end_date IS NULL OR tc.executed_at <= p_end_date)
    GROUP BY tc.tool_name, jt.error_type, jt.error_message, tc.result
    ORDER BY occurrence_count DESC
    LIMIT p_top_n;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tool_errors IS 
    'Returns top error patterns from failed tool calls, extracted from result JSONB using JSON_TABLE (PostgreSQL 18)';

-- ============================================================================
-- 3. Function: Get Tool Call Summary
-- ============================================================================
-- Comprehensive summary of tool call statistics

CREATE OR REPLACE FUNCTION get_tool_call_summary(
    p_user_id TEXT,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_calls INT,
    successful_calls INT,
    failed_calls INT,
    success_rate NUMERIC(5,2),
    unique_tools INT,
    unique_actions INT,
    first_call TIMESTAMP WITH TIME ZONE,
    last_call TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT AS total_calls,
        SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::INT AS successful_calls,
        SUM(CASE WHEN NOT tc.success THEN 1 ELSE 0 END)::INT AS failed_calls,
        COALESCE(
            ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
            0
        )::NUMERIC(5,2) AS success_rate,
        COUNT(DISTINCT tc.tool_name)::INT AS unique_tools,
        COUNT(DISTINCT jt.action)::INT AS unique_actions,
        MIN(tc.executed_at) AS first_call,
        MAX(tc.executed_at) AS last_call
    FROM tool_calls tc
    INNER JOIN chat_messages cm ON tc.message_id = cm.id
    INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
    JSON_TABLE(
        COALESCE(tc.arguments_jsonb, '{}'::jsonb),
        '$'
        COLUMNS (
            action TEXT PATH '$.action'
        )
    ) AS jt
    WHERE cc.user_id = p_user_id
      AND NOT cc.is_deleted
      AND (p_start_date IS NULL OR tc.executed_at >= p_start_date)
      AND (p_end_date IS NULL OR tc.executed_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tool_call_summary IS 
    'Returns a comprehensive summary of tool call statistics for a user';

-- ============================================================================
-- 4. Function: Get Tool Arguments Analysis (JSON_TABLE)
-- ============================================================================
-- Analyzes common argument patterns using JSON_TABLE

CREATE OR REPLACE FUNCTION get_tool_arguments_analysis(
    p_user_id TEXT,
    p_tool_name TEXT DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    tool_name TEXT,
    action TEXT,
    has_note_id BOOLEAN,
    has_query BOOLEAN,
    has_content BOOLEAN,
    call_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.tool_name::TEXT,
        COALESCE(jt.action, 'unknown')::TEXT AS action,
        (jt.note_id IS NOT NULL)::BOOLEAN AS has_note_id,
        (jt.query IS NOT NULL)::BOOLEAN AS has_query,
        (jt.content IS NOT NULL)::BOOLEAN AS has_content,
        COUNT(*)::INT AS call_count
    FROM tool_calls tc
    INNER JOIN chat_messages cm ON tc.message_id = cm.id
    INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
    JSON_TABLE(
        COALESCE(tc.arguments_jsonb, '{}'::jsonb),
        '$'
        COLUMNS (
            action TEXT PATH '$.action',
            note_id TEXT PATH '$.noteId',
            query TEXT PATH '$.query',
            content TEXT PATH '$.content'
        )
    ) AS jt
    WHERE cc.user_id = p_user_id
      AND NOT cc.is_deleted
      AND (p_tool_name IS NULL OR tc.tool_name = p_tool_name)
      AND (p_start_date IS NULL OR tc.executed_at >= p_start_date)
      AND (p_end_date IS NULL OR tc.executed_at <= p_end_date)
    GROUP BY tc.tool_name, jt.action, jt.note_id IS NOT NULL, jt.query IS NOT NULL, jt.content IS NOT NULL
    ORDER BY call_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tool_arguments_analysis IS 
    'Analyzes argument patterns for tool calls using JSON_TABLE to extract common fields (PostgreSQL 18)';

-- ============================================================================
-- 5. Function: Get Daily Tool Metrics
-- ============================================================================
-- Returns daily aggregates for tool call trends

CREATE OR REPLACE FUNCTION get_daily_tool_metrics(
    p_user_id TEXT,
    p_days_back INT DEFAULT 30
)
RETURNS TABLE (
    call_date DATE,
    total_calls INT,
    successful_calls INT,
    failed_calls INT,
    success_rate NUMERIC(5,2),
    unique_tools INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(tc.executed_at) AS call_date,
        COUNT(*)::INT AS total_calls,
        SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::INT AS successful_calls,
        SUM(CASE WHEN NOT tc.success THEN 1 ELSE 0 END)::INT AS failed_calls,
        COALESCE(
            ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
            0
        )::NUMERIC(5,2) AS success_rate,
        COUNT(DISTINCT tc.tool_name)::INT AS unique_tools
    FROM tool_calls tc
    INNER JOIN chat_messages cm ON tc.message_id = cm.id
    INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
    WHERE cc.user_id = p_user_id
      AND NOT cc.is_deleted
      AND tc.executed_at >= CURRENT_DATE - p_days_back
    GROUP BY DATE(tc.executed_at)
    ORDER BY call_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_daily_tool_metrics IS 
    'Returns daily tool call metrics for trend analysis';

-- ============================================================================
-- 6. View: Tool Call Analytics Summary
-- ============================================================================
-- Materialized view for frequently accessed analytics (optional optimization)

-- Note: This view requires manual refresh. Consider using pg_cron for scheduling.
-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tool_call_analytics AS
-- SELECT ... 
-- WITH DATA;

-- ============================================================================
-- 7. Index for JSON_TABLE Performance
-- ============================================================================
-- Ensure the GIN indexes exist for JSONB columns (created in migration 13)

-- Verify indexes exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'ix_tool_calls_arguments_gin'
    ) THEN
        RAISE NOTICE 'Creating GIN index on tool_calls.arguments_jsonb...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_arguments_gin
        ON tool_calls USING GIN(arguments_jsonb jsonb_path_ops);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'ix_tool_calls_result_gin'
    ) THEN
        RAISE NOTICE 'Creating GIN index on tool_calls.result_jsonb...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_result_gin
        ON tool_calls USING GIN(result_jsonb jsonb_path_ops);
    END IF;
END $$;

-- ============================================================================
-- 8. Additional Index for Date Range Queries
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_executed_at 
ON tool_calls(executed_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_success_executed 
ON tool_calls(success, executed_at) 
WHERE NOT success;

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tool call analytics functions created!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '  - get_tool_usage_by_action(user_id, start_date, end_date)';
    RAISE NOTICE '  - get_tool_errors(user_id, top_n, start_date, end_date)';
    RAISE NOTICE '  - get_tool_call_summary(user_id, start_date, end_date)';
    RAISE NOTICE '  - get_tool_arguments_analysis(user_id, tool_name, start_date, end_date)';
    RAISE NOTICE '  - get_daily_tool_metrics(user_id, days_back)';
    RAISE NOTICE '';
    RAISE NOTICE 'Example usage:';
    RAISE NOTICE '  SELECT * FROM get_tool_usage_by_action(''user-123'');';
    RAISE NOTICE '  SELECT * FROM get_tool_errors(''user-123'', 5);';
    RAISE NOTICE '  SELECT * FROM get_daily_tool_metrics(''user-123'', 7);';
    RAISE NOTICE '============================================';
END $$;
