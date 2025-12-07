-- Gemini Grounding Sources
-- This migration adds support for storing grounding sources from Google Search
-- that Gemini uses to ground its responses with real-time information.

-- ============================================================================
-- Table: grounding_sources
-- Stores Google Search sources used by Gemini for grounding responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS grounding_sources (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Reference to the chat message that contains grounded content
    message_id VARCHAR(128) NOT NULL,
    
    -- The conversation this source belongs to (denormalized for queries)
    conversation_id VARCHAR(128),
    
    -- User who received this grounded response (denormalized for queries)
    user_id VARCHAR(128),
    
    -- The URI/URL of the source
    uri TEXT NOT NULL,
    
    -- Title of the source page/document
    title TEXT,
    
    -- Snippet/excerpt from the source used in grounding
    snippet TEXT,
    
    -- The domain of the source (extracted from URI for analytics)
    domain VARCHAR(256),
    
    -- Relevance score from Gemini (if available)
    relevance_score REAL,
    
    -- Position/order of this source in the grounding results
    source_index INTEGER DEFAULT 0,
    
    -- The query that triggered this grounding
    query_text TEXT,
    
    -- Timestamp when the source was retrieved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to chat_messages
    CONSTRAINT fk_grounding_sources_message
        FOREIGN KEY (message_id) 
        REFERENCES chat_messages(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE grounding_sources IS 'Stores Google Search sources used by Gemini for grounding responses';
COMMENT ON COLUMN grounding_sources.uri IS 'URL of the source used for grounding';
COMMENT ON COLUMN grounding_sources.title IS 'Title of the source page';
COMMENT ON COLUMN grounding_sources.snippet IS 'Text snippet from the source';
COMMENT ON COLUMN grounding_sources.domain IS 'Domain extracted from URI for analytics';
COMMENT ON COLUMN grounding_sources.relevance_score IS 'Relevance score from Gemini grounding metadata';

-- ============================================================================
-- Indexes for efficient queries
-- ============================================================================

-- Index for looking up sources by message
CREATE INDEX IF NOT EXISTS idx_grounding_sources_message_id 
    ON grounding_sources(message_id);

-- Index for looking up sources by conversation
CREATE INDEX IF NOT EXISTS idx_grounding_sources_conversation_id 
    ON grounding_sources(conversation_id);

-- Index for looking up sources by user
CREATE INDEX IF NOT EXISTS idx_grounding_sources_user_id 
    ON grounding_sources(user_id);

-- Index for domain analytics (which domains are used most)
CREATE INDEX IF NOT EXISTS idx_grounding_sources_domain 
    ON grounding_sources(domain);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_grounding_sources_created_at 
    ON grounding_sources(created_at DESC);

-- Full-text search on title and snippet for finding sources
CREATE INDEX IF NOT EXISTS idx_grounding_sources_text_search 
    ON grounding_sources USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(snippet, '')));

-- ============================================================================
-- Helper function to extract domain from URI
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_domain_from_uri(uri TEXT)
RETURNS TEXT AS $$
DECLARE
    domain_part TEXT;
BEGIN
    -- Extract domain from URI (e.g., "https://example.com/path" -> "example.com")
    IF uri IS NULL OR uri = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove protocol
    domain_part := regexp_replace(uri, '^https?://', '');
    -- Remove path and query string
    domain_part := split_part(domain_part, '/', 1);
    -- Remove port if present
    domain_part := split_part(domain_part, ':', 1);
    
    RETURN domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_domain_from_uri(TEXT) IS 'Extracts domain from a URI for analytics';

-- ============================================================================
-- Trigger to auto-populate domain field
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_grounding_source_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.domain IS NULL AND NEW.uri IS NOT NULL THEN
        NEW.domain := extract_domain_from_uri(NEW.uri);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_grounding_source_domain ON grounding_sources;
CREATE TRIGGER tr_grounding_source_domain
    BEFORE INSERT OR UPDATE ON grounding_sources
    FOR EACH ROW
    EXECUTE FUNCTION populate_grounding_source_domain();

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View: Most used domains for grounding
CREATE OR REPLACE VIEW grounding_domain_stats AS
SELECT 
    domain,
    COUNT(*) as usage_count,
    COUNT(DISTINCT message_id) as unique_messages,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(relevance_score)::numeric, 3) as avg_relevance_score
FROM grounding_sources
WHERE domain IS NOT NULL
GROUP BY domain
ORDER BY usage_count DESC;

COMMENT ON VIEW grounding_domain_stats IS 'Statistics on domains used for Gemini grounding';

-- View: Grounding usage by user
CREATE OR REPLACE VIEW user_grounding_stats AS
SELECT 
    user_id,
    COUNT(*) as total_sources,
    COUNT(DISTINCT message_id) as grounded_messages,
    COUNT(DISTINCT domain) as unique_domains,
    MAX(created_at) as last_grounded_at
FROM grounding_sources
GROUP BY user_id
ORDER BY total_sources DESC;

COMMENT ON VIEW user_grounding_stats IS 'Grounding source usage statistics by user';

-- View: Daily grounding activity
CREATE OR REPLACE VIEW grounding_daily_stats AS
SELECT 
    DATE(created_at) as grounding_date,
    COUNT(*) as total_sources,
    COUNT(DISTINCT message_id) as grounded_messages,
    COUNT(DISTINCT domain) as unique_domains
FROM grounding_sources
GROUP BY DATE(created_at)
ORDER BY grounding_date DESC;

COMMENT ON VIEW grounding_daily_stats IS 'Daily grounding source statistics';
