-- ============================================================================
-- Second Brain Database - Grok/X.AI Features
-- ============================================================================
-- This migration adds support for Grok-specific features:
--   - Live Search and DeepSearch tracking
--   - Think Mode reasoning logs
-- ============================================================================

-- ============================================================================
-- Table: grok_search_logs
-- Tracks Live Search and DeepSearch queries made by Grok
-- ============================================================================

CREATE TABLE IF NOT EXISTS grok_search_logs (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the chat message that triggered this search
    message_id VARCHAR(128) NOT NULL,
    
    -- The conversation this search belongs to (denormalized for queries)
    conversation_id VARCHAR(128),
    
    -- User who initiated the search (denormalized for queries)
    user_id VARCHAR(128),
    
    -- The search query text
    query TEXT NOT NULL,
    
    -- Search mode: auto, on, off
    search_mode VARCHAR(32),
    
    -- Sources searched: web, x (Twitter)
    sources TEXT[] DEFAULT '{}',
    
    -- Recency filter: hour, day, week, month
    recency VARCHAR(32),
    
    -- Whether this was a DeepSearch (comprehensive research)
    is_deep_search BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Number of results returned
    result_count INTEGER,
    
    -- Time taken for the search in milliseconds
    search_time_ms INTEGER,
    
    -- Timestamp when the search was performed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to chat_messages
    CONSTRAINT fk_grok_search_logs_message
        FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE grok_search_logs IS 'Tracks Grok Live Search and DeepSearch queries for analytics';
COMMENT ON COLUMN grok_search_logs.search_mode IS 'Search mode: auto (model decides), on (always search), off (never search)';
COMMENT ON COLUMN grok_search_logs.sources IS 'Array of sources searched: web, x (Twitter)';
COMMENT ON COLUMN grok_search_logs.recency IS 'Recency filter for search results: hour, day, week, month';
COMMENT ON COLUMN grok_search_logs.is_deep_search IS 'Whether this was a DeepSearch (comprehensive web research)';
COMMENT ON COLUMN grok_search_logs.search_time_ms IS 'Time taken for the search in milliseconds';

-- ============================================================================
-- Indexes for grok_search_logs
-- ============================================================================

-- Index for looking up searches by message
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_message_id 
    ON grok_search_logs(message_id);

-- Index for looking up searches by user
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_user_id 
    ON grok_search_logs(user_id);

-- Index for looking up searches by conversation
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_conversation_id 
    ON grok_search_logs(conversation_id);

-- Index for filtering by search type
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_deep_search 
    ON grok_search_logs(is_deep_search);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_created_at 
    ON grok_search_logs(created_at DESC);

-- Composite index for user + time range queries
CREATE INDEX IF NOT EXISTS idx_grok_search_logs_user_time 
    ON grok_search_logs(user_id, created_at DESC);

-- ============================================================================
-- Table: grok_search_sources
-- Stores individual sources returned from Grok searches
-- (Extends the generic grounding_sources table for Grok-specific metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS grok_search_sources (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the search log
    search_log_id VARCHAR(128) NOT NULL,
    
    -- The URL of the source
    url TEXT NOT NULL,
    
    -- Title of the source
    title TEXT,
    
    -- Text snippet from the source
    snippet TEXT,
    
    -- Source type: web, x_post, news, etc.
    source_type VARCHAR(32),
    
    -- When the source was published (if available)
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Relevance score from Grok
    relevance_score REAL,
    
    -- Position in the search results
    source_index INTEGER DEFAULT 0,
    
    -- Timestamp when this source was recorded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to grok_search_logs
    CONSTRAINT fk_grok_search_sources_search
        FOREIGN KEY (search_log_id) 
        REFERENCES grok_search_logs(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE grok_search_sources IS 'Stores individual sources from Grok Live Search and DeepSearch results';
COMMENT ON COLUMN grok_search_sources.source_type IS 'Type of source: web, x_post, news, etc.';
COMMENT ON COLUMN grok_search_sources.published_at IS 'Publication date of the source content';

-- ============================================================================
-- Indexes for grok_search_sources
-- ============================================================================

-- Index for looking up sources by search log
CREATE INDEX IF NOT EXISTS idx_grok_search_sources_search_log_id 
    ON grok_search_sources(search_log_id);

-- Index for source type analytics
CREATE INDEX IF NOT EXISTS idx_grok_search_sources_type 
    ON grok_search_sources(source_type);

-- ============================================================================
-- Table: grok_think_logs
-- Tracks Think Mode (extended reasoning) sessions in Grok
-- ============================================================================

CREATE TABLE IF NOT EXISTS grok_think_logs (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the chat message that used think mode
    message_id VARCHAR(128) NOT NULL,
    
    -- The conversation this thinking belongs to (denormalized for queries)
    conversation_id VARCHAR(128),
    
    -- User who initiated the think mode (denormalized for queries)
    user_id VARCHAR(128),
    
    -- Effort level: low, medium, high
    effort_level VARCHAR(32),
    
    -- Time spent thinking in milliseconds
    thinking_time_ms INTEGER,
    
    -- Number of reasoning steps taken
    steps_count INTEGER,
    
    -- The full reasoning process as JSON
    reasoning_json JSONB,
    
    -- The model used for thinking
    model VARCHAR(64),
    
    -- Timestamp when the thinking started
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to chat_messages
    CONSTRAINT fk_grok_think_logs_message
        FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE grok_think_logs IS 'Tracks Grok Think Mode (extended reasoning) sessions for analytics';
COMMENT ON COLUMN grok_think_logs.effort_level IS 'Reasoning effort level: low, medium, high';
COMMENT ON COLUMN grok_think_logs.thinking_time_ms IS 'Time spent in thinking/reasoning in milliseconds';
COMMENT ON COLUMN grok_think_logs.steps_count IS 'Number of reasoning steps taken';
COMMENT ON COLUMN grok_think_logs.reasoning_json IS 'Full reasoning process stored as JSON';

-- ============================================================================
-- Indexes for grok_think_logs
-- ============================================================================

-- Index for looking up thinking logs by message
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_message_id 
    ON grok_think_logs(message_id);

-- Index for looking up thinking logs by user
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_user_id 
    ON grok_think_logs(user_id);

-- Index for looking up thinking logs by conversation
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_conversation_id 
    ON grok_think_logs(conversation_id);

-- Index for effort level analytics
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_effort 
    ON grok_think_logs(effort_level);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_created_at 
    ON grok_think_logs(created_at DESC);

-- GIN index for JSONB reasoning queries
CREATE INDEX IF NOT EXISTS idx_grok_think_logs_reasoning_gin 
    ON grok_think_logs USING GIN(reasoning_json jsonb_path_ops);

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View: Grok search statistics
CREATE OR REPLACE VIEW grok_search_stats AS
SELECT 
    search_mode,
    is_deep_search,
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(result_count)::numeric, 2) as avg_results,
    ROUND(AVG(search_time_ms)::numeric, 2) as avg_search_time_ms
FROM grok_search_logs
GROUP BY search_mode, is_deep_search
ORDER BY total_searches DESC;

COMMENT ON VIEW grok_search_stats IS 'Aggregated statistics for Grok search operations';

-- View: Grok think mode statistics
CREATE OR REPLACE VIEW grok_think_stats AS
SELECT 
    effort_level,
    model,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(thinking_time_ms)::numeric, 2) as avg_thinking_time_ms,
    ROUND(AVG(steps_count)::numeric, 2) as avg_steps
FROM grok_think_logs
GROUP BY effort_level, model
ORDER BY total_sessions DESC;

COMMENT ON VIEW grok_think_stats IS 'Aggregated statistics for Grok Think Mode usage';

-- View: Daily Grok feature usage
CREATE OR REPLACE VIEW grok_daily_usage AS
SELECT 
    DATE(COALESCE(s.created_at, t.created_at)) as usage_date,
    COUNT(DISTINCT s.id) as search_count,
    COUNT(DISTINCT CASE WHEN s.is_deep_search THEN s.id END) as deep_search_count,
    COUNT(DISTINCT t.id) as think_sessions
FROM grok_search_logs s
FULL OUTER JOIN grok_think_logs t 
    ON DATE(s.created_at) = DATE(t.created_at)
GROUP BY DATE(COALESCE(s.created_at, t.created_at))
ORDER BY usage_date DESC;

COMMENT ON VIEW grok_daily_usage IS 'Daily usage statistics for Grok features';
