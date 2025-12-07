-- ============================================================================
-- Second Brain Database - Claude/Anthropic Features
-- ============================================================================
-- This migration adds support for Claude-specific features:
--   - Prompt caching statistics
--   - Batch processing jobs
--   - Document citations
-- ============================================================================

-- ============================================================================
-- Table: claude_cache_stats
-- Tracks prompt caching usage for cost and latency analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS claude_cache_stats (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User who made the request
    user_id VARCHAR(128) NOT NULL,
    
    -- Optional reference to a conversation
    conversation_id VARCHAR(128),
    
    -- Optional reference to a chat message
    message_id VARCHAR(128),
    
    -- Tokens used to create new cache entries
    cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Tokens read from existing cache
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Total input tokens for the request
    input_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Total output tokens for the response
    output_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Estimated cost savings from caching (in USD cents)
    estimated_savings_cents REAL,
    
    -- The model used
    model VARCHAR(64) NOT NULL,
    
    -- Whether caching was enabled for this request
    cache_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamp when the request was made
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE claude_cache_stats IS 'Tracks Claude prompt caching usage for cost and latency analytics';
COMMENT ON COLUMN claude_cache_stats.cache_creation_tokens IS 'Tokens used to create new cache entries (charged at full rate)';
COMMENT ON COLUMN claude_cache_stats.cache_read_tokens IS 'Tokens read from existing cache (charged at reduced rate)';
COMMENT ON COLUMN claude_cache_stats.estimated_savings_cents IS 'Estimated cost savings from cache hits in USD cents';

-- ============================================================================
-- Indexes for claude_cache_stats
-- ============================================================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_claude_cache_stats_user_id 
    ON claude_cache_stats(user_id);

-- Index for conversation lookup
CREATE INDEX IF NOT EXISTS idx_claude_cache_stats_conversation_id 
    ON claude_cache_stats(conversation_id) 
    WHERE conversation_id IS NOT NULL;

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_claude_cache_stats_created_at 
    ON claude_cache_stats(created_at DESC);

-- Index for model analytics
CREATE INDEX IF NOT EXISTS idx_claude_cache_stats_model 
    ON claude_cache_stats(model);

-- Composite index for user + time range queries
CREATE INDEX IF NOT EXISTS idx_claude_cache_stats_user_time 
    ON claude_cache_stats(user_id, created_at DESC);

-- ============================================================================
-- Table: claude_batch_jobs
-- Tracks batch processing jobs for bulk operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS claude_batch_jobs (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User who created the batch job
    user_id VARCHAR(128) NOT NULL,
    
    -- The batch ID returned by Claude API
    batch_id VARCHAR(256) NOT NULL UNIQUE,
    
    -- Job status: submitted, in_progress, completed, failed, cancelled
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    
    -- Total number of requests in the batch
    total_requests INTEGER NOT NULL,
    
    -- Number of successfully completed requests
    completed_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Number of failed requests
    failed_requests INTEGER NOT NULL DEFAULT 0,
    
    -- The model used for the batch
    model VARCHAR(64) NOT NULL,
    
    -- Purpose/description of the batch job
    description TEXT,
    
    -- Total input tokens across all requests
    total_input_tokens INTEGER,
    
    -- Total output tokens across all responses
    total_output_tokens INTEGER,
    
    -- Estimated cost savings from batch processing (50% discount)
    estimated_savings_cents REAL,
    
    -- Error message if the job failed
    error_message TEXT,
    
    -- JSON containing batch results (or reference to results file)
    results_json JSONB,
    
    -- Timestamp when the job was created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamp when the job was completed
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Last status update timestamp
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE claude_batch_jobs IS 'Tracks Claude batch processing jobs for bulk operations';
COMMENT ON COLUMN claude_batch_jobs.batch_id IS 'Unique batch ID from Claude API';
COMMENT ON COLUMN claude_batch_jobs.status IS 'Job status: submitted, in_progress, completed, failed, cancelled';
COMMENT ON COLUMN claude_batch_jobs.estimated_savings_cents IS 'Cost savings from 50% batch discount';
COMMENT ON COLUMN claude_batch_jobs.results_json IS 'Batch results as JSON (for small batches) or reference';

-- ============================================================================
-- Indexes for claude_batch_jobs
-- ============================================================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_claude_batch_jobs_user_id 
    ON claude_batch_jobs(user_id);

-- Index for batch ID lookup
CREATE INDEX IF NOT EXISTS idx_claude_batch_jobs_batch_id 
    ON claude_batch_jobs(batch_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_claude_batch_jobs_status 
    ON claude_batch_jobs(status);

-- Index for active jobs (not completed)
CREATE INDEX IF NOT EXISTS idx_claude_batch_jobs_active 
    ON claude_batch_jobs(status, updated_at DESC) 
    WHERE status IN ('submitted', 'in_progress');

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_claude_batch_jobs_created_at 
    ON claude_batch_jobs(created_at DESC);

-- ============================================================================
-- Table: claude_citations
-- Stores document citations from Claude responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS claude_citations (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the chat message containing the citation
    message_id VARCHAR(128) NOT NULL,
    
    -- The conversation this citation belongs to (denormalized)
    conversation_id VARCHAR(128),
    
    -- User who received this citation (denormalized)
    user_id VARCHAR(128),
    
    -- Document identifier (e.g., file ID, note ID, URL hash)
    document_id VARCHAR(256),
    
    -- Document title or name
    document_title TEXT,
    
    -- Page number within the document (if applicable)
    page_number INTEGER,
    
    -- The cited text/quote
    cited_text TEXT NOT NULL,
    
    -- Start character index in the source document
    start_index INTEGER,
    
    -- End character index in the source document
    end_index INTEGER,
    
    -- Start character index in the response where citation is used
    response_start_index INTEGER,
    
    -- End character index in the response where citation is used
    response_end_index INTEGER,
    
    -- Confidence score for the citation relevance
    confidence_score REAL,
    
    -- Citation type: document, note, web, etc.
    citation_type VARCHAR(32) DEFAULT 'document',
    
    -- Position/order of this citation in the response
    citation_index INTEGER DEFAULT 0,
    
    -- Timestamp when the citation was created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to chat_messages
    CONSTRAINT fk_claude_citations_message
        FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE claude_citations IS 'Stores document citations from Claude responses for source attribution';
COMMENT ON COLUMN claude_citations.document_id IS 'Identifier for the source document';
COMMENT ON COLUMN claude_citations.page_number IS 'Page number in the document (for PDFs)';
COMMENT ON COLUMN claude_citations.cited_text IS 'The exact text being cited';
COMMENT ON COLUMN claude_citations.start_index IS 'Start position in the source document';
COMMENT ON COLUMN claude_citations.end_index IS 'End position in the source document';
COMMENT ON COLUMN claude_citations.citation_type IS 'Type of citation source: document, note, web, etc.';

-- ============================================================================
-- Indexes for claude_citations
-- ============================================================================

-- Index for message lookup
CREATE INDEX IF NOT EXISTS idx_claude_citations_message_id 
    ON claude_citations(message_id);

-- Index for conversation lookup
CREATE INDEX IF NOT EXISTS idx_claude_citations_conversation_id 
    ON claude_citations(conversation_id) 
    WHERE conversation_id IS NOT NULL;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_claude_citations_user_id 
    ON claude_citations(user_id) 
    WHERE user_id IS NOT NULL;

-- Index for document lookup
CREATE INDEX IF NOT EXISTS idx_claude_citations_document_id 
    ON claude_citations(document_id) 
    WHERE document_id IS NOT NULL;

-- Index for citation type analytics
CREATE INDEX IF NOT EXISTS idx_claude_citations_type 
    ON claude_citations(citation_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_claude_citations_created_at 
    ON claude_citations(created_at DESC);

-- Full-text search on cited text
CREATE INDEX IF NOT EXISTS idx_claude_citations_text_search 
    ON claude_citations USING GIN(to_tsvector('english', cited_text));

-- ============================================================================
-- Trigger: Update batch job timestamp on modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_claude_batch_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_claude_batch_job_updated_at ON claude_batch_jobs;
CREATE TRIGGER tr_claude_batch_job_updated_at
    BEFORE UPDATE ON claude_batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_claude_batch_job_updated_at();

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View: Cache usage statistics
CREATE OR REPLACE VIEW claude_cache_usage_stats AS
SELECT 
    model,
    DATE(created_at) as usage_date,
    COUNT(*) as total_requests,
    SUM(cache_creation_tokens) as total_cache_creation_tokens,
    SUM(cache_read_tokens) as total_cache_read_tokens,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    ROUND(SUM(estimated_savings_cents)::numeric, 2) as total_savings_cents,
    ROUND(100.0 * SUM(cache_read_tokens) / NULLIF(SUM(cache_read_tokens) + SUM(cache_creation_tokens), 0), 2) as cache_hit_rate_percent
FROM claude_cache_stats
GROUP BY model, DATE(created_at)
ORDER BY usage_date DESC, model;

COMMENT ON VIEW claude_cache_usage_stats IS 'Daily cache usage statistics by model';

-- View: User cache savings
CREATE OR REPLACE VIEW claude_user_cache_savings AS
SELECT 
    user_id,
    COUNT(*) as total_requests,
    SUM(cache_read_tokens) as total_cache_hits,
    SUM(cache_creation_tokens) as total_cache_misses,
    ROUND(SUM(estimated_savings_cents)::numeric / 100, 2) as total_savings_usd,
    ROUND(100.0 * SUM(cache_read_tokens) / NULLIF(SUM(cache_read_tokens) + SUM(cache_creation_tokens), 0), 2) as cache_hit_rate_percent
FROM claude_cache_stats
GROUP BY user_id
ORDER BY total_savings_usd DESC;

COMMENT ON VIEW claude_user_cache_savings IS 'Per-user cache savings summary';

-- View: Batch job statistics
CREATE OR REPLACE VIEW claude_batch_job_stats AS
SELECT 
    status,
    model,
    COUNT(*) as job_count,
    SUM(total_requests) as total_requests,
    SUM(completed_requests) as total_completed,
    SUM(failed_requests) as total_failed,
    ROUND(AVG(
        CASE WHEN completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 60 
        END
    )::numeric, 2) as avg_duration_minutes,
    ROUND(SUM(estimated_savings_cents)::numeric / 100, 2) as total_savings_usd
FROM claude_batch_jobs
GROUP BY status, model
ORDER BY job_count DESC;

COMMENT ON VIEW claude_batch_job_stats IS 'Batch job statistics by status and model';

-- View: Citation statistics
CREATE OR REPLACE VIEW claude_citation_stats AS
SELECT 
    citation_type,
    COUNT(*) as total_citations,
    COUNT(DISTINCT message_id) as messages_with_citations,
    COUNT(DISTINCT document_id) as unique_documents,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(confidence_score)::numeric, 3) as avg_confidence
FROM claude_citations
GROUP BY citation_type
ORDER BY total_citations DESC;

COMMENT ON VIEW claude_citation_stats IS 'Citation usage statistics by type';

-- View: Most cited documents
CREATE OR REPLACE VIEW claude_most_cited_documents AS
SELECT 
    document_id,
    document_title,
    citation_type,
    COUNT(*) as citation_count,
    COUNT(DISTINCT message_id) as unique_messages,
    COUNT(DISTINCT user_id) as unique_users
FROM claude_citations
WHERE document_id IS NOT NULL
GROUP BY document_id, document_title, citation_type
ORDER BY citation_count DESC
LIMIT 100;

COMMENT ON VIEW claude_most_cited_documents IS 'Top 100 most cited documents';
