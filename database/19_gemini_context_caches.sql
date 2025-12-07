-- Gemini Context Caching Support
-- This migration adds support for tracking Gemini context caches
-- which reduce latency and costs for repeated requests with large contexts.

-- ============================================================================
-- Table: gemini_context_caches
-- Tracks context caches created on the Gemini API for cost/latency optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS gemini_context_caches (
    -- Local database ID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User who owns this cache
    user_id VARCHAR(128) NOT NULL,
    
    -- The cache name returned by Gemini API (e.g., "cachedContents/abc123")
    -- This is the key used to reference the cache in generation requests
    cache_name VARCHAR(512) NOT NULL UNIQUE,
    
    -- Human-readable display name for the cache
    display_name VARCHAR(256) NOT NULL,
    
    -- The model this cache was created for (e.g., "gemini-2.0-flash")
    model VARCHAR(64) NOT NULL,
    
    -- SHA-256 hash of the cached content for deduplication
    content_hash VARCHAR(64) NOT NULL,
    
    -- Estimated token count of the cached content (from Gemini API)
    token_count INTEGER,
    
    -- When the cache will expire on the Gemini API
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE gemini_context_caches IS 'Tracks Gemini context caches for reducing latency and costs with large contexts';
COMMENT ON COLUMN gemini_context_caches.cache_name IS 'The cache identifier from Gemini API, used in generation requests';
COMMENT ON COLUMN gemini_context_caches.content_hash IS 'SHA-256 hash of content for cache deduplication';
COMMENT ON COLUMN gemini_context_caches.token_count IS 'Token count from Gemini API - caching requires minimum ~32K tokens';

-- ============================================================================
-- Indexes for efficient queries
-- ============================================================================

-- Index for user lookup (list user's caches)
CREATE INDEX IF NOT EXISTS idx_gemini_caches_user_id 
    ON gemini_context_caches(user_id);

-- Index for expiration cleanup (find expired caches)
CREATE INDEX IF NOT EXISTS idx_gemini_caches_expires 
    ON gemini_context_caches(expires_at);

-- Composite index for cache deduplication (find by content hash + model + user)
CREATE INDEX IF NOT EXISTS idx_gemini_caches_content_hash 
    ON gemini_context_caches(user_id, content_hash, model);

-- Index for looking up by cache name (Gemini API reference)
CREATE INDEX IF NOT EXISTS idx_gemini_caches_cache_name 
    ON gemini_context_caches(cache_name);

-- Partial index for active (non-expired) caches
CREATE INDEX IF NOT EXISTS idx_gemini_caches_active 
    ON gemini_context_caches(user_id, model) 
    WHERE expires_at > NOW();

-- ============================================================================
-- Trigger: Update updated_at timestamp on modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gemini_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_gemini_cache_updated_at ON gemini_context_caches;
CREATE TRIGGER tr_gemini_cache_updated_at
    BEFORE UPDATE ON gemini_context_caches
    FOR EACH ROW
    EXECUTE FUNCTION update_gemini_cache_updated_at();

-- ============================================================================
-- Optional: Cleanup function for expired caches
-- Can be run periodically or as a scheduled job
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_gemini_caches()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM gemini_context_caches
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_gemini_caches() IS 'Removes expired context caches from the database';
