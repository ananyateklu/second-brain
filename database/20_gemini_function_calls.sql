-- Gemini Function Call Analytics
-- This migration adds support for tracking Gemini function call executions
-- for analytics, debugging, and performance monitoring.

-- ============================================================================
-- Table: gemini_function_calls
-- Tracks function calls made by Gemini during agent interactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS gemini_function_calls (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the chat message that triggered this function call
    message_id VARCHAR(128) NOT NULL,
    
    -- The conversation this function call belongs to (denormalized for queries)
    conversation_id VARCHAR(128),
    
    -- User who initiated the conversation (denormalized for queries)
    user_id VARCHAR(128),
    
    -- Name of the function that was called (e.g., "search_notes", "create_note")
    function_name VARCHAR(128) NOT NULL,
    
    -- The arguments passed to the function (JSON format)
    arguments JSONB,
    
    -- The result returned by the function (JSON format)
    result JSONB,
    
    -- Execution time in milliseconds
    execution_time_ms INTEGER,
    
    -- Whether the function execution was successful
    success BOOLEAN NOT NULL DEFAULT true,
    
    -- Error message if the function failed
    error_message TEXT,
    
    -- The model that made the function call
    model VARCHAR(64),
    
    -- Provider (should be "Gemini" for this table)
    provider VARCHAR(32) DEFAULT 'Gemini',
    
    -- Timestamp when the function was called
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to chat_messages
    CONSTRAINT fk_gemini_function_calls_message
        FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE gemini_function_calls IS 'Tracks Gemini function call executions for analytics and debugging';
COMMENT ON COLUMN gemini_function_calls.function_name IS 'Name of the executed function (e.g., search_notes, create_note)';
COMMENT ON COLUMN gemini_function_calls.arguments IS 'JSON arguments passed to the function';
COMMENT ON COLUMN gemini_function_calls.result IS 'JSON result returned by the function';
COMMENT ON COLUMN gemini_function_calls.execution_time_ms IS 'Function execution time in milliseconds';

-- ============================================================================
-- Indexes for efficient queries
-- ============================================================================

-- Index for looking up function calls by message
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_message_id 
    ON gemini_function_calls(message_id);

-- Index for looking up function calls by conversation
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_conversation_id 
    ON gemini_function_calls(conversation_id);

-- Index for looking up function calls by user
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_user_id 
    ON gemini_function_calls(user_id);

-- Index for function name analytics (which functions are called most)
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_function_name 
    ON gemini_function_calls(function_name);

-- Index for finding failed function calls
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_failed 
    ON gemini_function_calls(success) 
    WHERE success = false;

-- Index for time-based queries (recent function calls)
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_created_at 
    ON gemini_function_calls(created_at DESC);

-- Composite index for user + time range queries
CREATE INDEX IF NOT EXISTS idx_gemini_func_calls_user_time 
    ON gemini_function_calls(user_id, created_at DESC);

-- ============================================================================
-- Analytics Views (Optional)
-- ============================================================================

-- View: Function call statistics by function name
CREATE OR REPLACE VIEW gemini_function_call_stats AS
SELECT 
    function_name,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE success = true) as successful_calls,
    COUNT(*) FILTER (WHERE success = false) as failed_calls,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_execution_time_ms,
    MAX(execution_time_ms) as max_execution_time_ms,
    MIN(execution_time_ms) as min_execution_time_ms
FROM gemini_function_calls
GROUP BY function_name
ORDER BY total_calls DESC;

COMMENT ON VIEW gemini_function_call_stats IS 'Aggregated statistics for Gemini function calls by function name';

-- View: Daily function call counts
CREATE OR REPLACE VIEW gemini_function_calls_daily AS
SELECT 
    DATE(created_at) as call_date,
    function_name,
    COUNT(*) as call_count,
    COUNT(*) FILTER (WHERE success = true) as success_count,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_time_ms
FROM gemini_function_calls
GROUP BY DATE(created_at), function_name
ORDER BY call_date DESC, call_count DESC;

COMMENT ON VIEW gemini_function_calls_daily IS 'Daily breakdown of Gemini function calls';
