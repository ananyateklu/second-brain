-- ============================================================================
-- Second Brain Database - Ollama Features
-- ============================================================================
-- This migration adds support for Ollama-specific features:
--   - Model pull/download history
--   - Model management tracking
-- ============================================================================

-- ============================================================================
-- Table: ollama_model_pulls
-- Tracks model download/pull history
-- ============================================================================

CREATE TABLE IF NOT EXISTS ollama_model_pulls (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User who initiated the pull (optional for system pulls)
    user_id VARCHAR(128),
    
    -- Full model name (e.g., 'qwen3:4b', 'llama3.2:3b')
    model_name VARCHAR(256) NOT NULL,
    
    -- Base URL of the Ollama instance
    base_url VARCHAR(512) NOT NULL,
    
    -- Pull status: queued, pulling, completed, failed, cancelled
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    
    -- Total size in bytes
    total_bytes BIGINT,
    
    -- Bytes downloaded so far
    downloaded_bytes BIGINT DEFAULT 0,
    
    -- Duration of the pull in seconds
    duration_seconds INTEGER,
    
    -- Download speed in bytes per second (average)
    avg_speed_bps BIGINT,
    
    -- Error message if the pull failed
    error_message TEXT,
    
    -- Model digest/hash after successful pull
    digest VARCHAR(128),
    
    -- Model family (e.g., 'llama', 'qwen', 'mistral')
    model_family VARCHAR(64),
    
    -- Model parameter size (e.g., '4b', '7b', '70b')
    parameter_size VARCHAR(32),
    
    -- Quantization level (e.g., 'q4_0', 'q8_0', 'fp16')
    quantization VARCHAR(32),
    
    -- Timestamp when the pull was started
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Timestamp when the pull was completed
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Last progress update timestamp
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE ollama_model_pulls IS 'Tracks Ollama model pull/download history';
COMMENT ON COLUMN ollama_model_pulls.model_name IS 'Full model name including tag (e.g., qwen3:4b)';
COMMENT ON COLUMN ollama_model_pulls.base_url IS 'Ollama server URL (local or remote)';
COMMENT ON COLUMN ollama_model_pulls.status IS 'Pull status: queued, pulling, completed, failed, cancelled';
COMMENT ON COLUMN ollama_model_pulls.total_bytes IS 'Total model size in bytes';
COMMENT ON COLUMN ollama_model_pulls.downloaded_bytes IS 'Bytes downloaded so far (for progress tracking)';
COMMENT ON COLUMN ollama_model_pulls.digest IS 'SHA256 digest of the model after successful pull';
COMMENT ON COLUMN ollama_model_pulls.model_family IS 'Model family: llama, qwen, mistral, phi, gemma, etc.';

-- ============================================================================
-- Indexes for ollama_model_pulls
-- ============================================================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_user_id 
    ON ollama_model_pulls(user_id) 
    WHERE user_id IS NOT NULL;

-- Index for model name lookup
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_model_name 
    ON ollama_model_pulls(model_name);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_status 
    ON ollama_model_pulls(status);

-- Index for active pulls (not completed)
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_active 
    ON ollama_model_pulls(status, updated_at DESC) 
    WHERE status IN ('queued', 'pulling');

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_started_at 
    ON ollama_model_pulls(started_at DESC);

-- Index for base URL (for remote Ollama instances)
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_base_url 
    ON ollama_model_pulls(base_url);

-- Index for model family analytics
CREATE INDEX IF NOT EXISTS idx_ollama_model_pulls_model_family 
    ON ollama_model_pulls(model_family) 
    WHERE model_family IS NOT NULL;

-- ============================================================================
-- Table: ollama_model_info
-- Stores cached information about available/installed models
-- ============================================================================

CREATE TABLE IF NOT EXISTS ollama_model_info (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Full model name (e.g., 'qwen3:4b')
    model_name VARCHAR(256) NOT NULL,
    
    -- Base URL of the Ollama instance
    base_url VARCHAR(512) NOT NULL,
    
    -- Model digest/hash
    digest VARCHAR(128),
    
    -- Size in bytes
    size_bytes BIGINT,
    
    -- Model family
    model_family VARCHAR(64),
    
    -- Parameter count (e.g., '4B', '7B')
    parameter_count VARCHAR(32),
    
    -- Quantization level
    quantization VARCHAR(32),
    
    -- Model format (e.g., 'gguf')
    format VARCHAR(32),
    
    -- Model capabilities as JSON array
    -- e.g., ["chat", "completion", "embedding", "vision"]
    capabilities TEXT[],
    
    -- Context window size
    context_length INTEGER,
    
    -- Whether the model supports tool/function calling
    supports_tools BOOLEAN DEFAULT FALSE,
    
    -- Whether the model supports vision/images
    supports_vision BOOLEAN DEFAULT FALSE,
    
    -- Modelfile content (for custom models)
    modelfile TEXT,
    
    -- Template used for chat formatting
    template TEXT,
    
    -- License information
    license TEXT,
    
    -- When the model was last used
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage count
    usage_count INTEGER DEFAULT 0,
    
    -- When this info was last updated
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- When this model info was first recorded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint on model + base_url
    CONSTRAINT uq_ollama_model_info_model_url UNIQUE (model_name, base_url)
);

-- Add comments for documentation
COMMENT ON TABLE ollama_model_info IS 'Cached information about Ollama models';
COMMENT ON COLUMN ollama_model_info.capabilities IS 'Array of model capabilities: chat, completion, embedding, vision';
COMMENT ON COLUMN ollama_model_info.supports_tools IS 'Whether the model supports function/tool calling';
COMMENT ON COLUMN ollama_model_info.supports_vision IS 'Whether the model can process images';
COMMENT ON COLUMN ollama_model_info.modelfile IS 'Modelfile content for custom models';

-- ============================================================================
-- Indexes for ollama_model_info
-- ============================================================================

-- Index for model name lookup
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_model_name 
    ON ollama_model_info(model_name);

-- Index for base URL
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_base_url 
    ON ollama_model_info(base_url);

-- Index for capability filtering (supports tools)
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_tools 
    ON ollama_model_info(supports_tools) 
    WHERE supports_tools = TRUE;

-- Index for capability filtering (supports vision)
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_vision 
    ON ollama_model_info(supports_vision) 
    WHERE supports_vision = TRUE;

-- Index for most used models
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_usage 
    ON ollama_model_info(usage_count DESC);

-- Index for recently used models
CREATE INDEX IF NOT EXISTS idx_ollama_model_info_last_used 
    ON ollama_model_info(last_used_at DESC) 
    WHERE last_used_at IS NOT NULL;

-- ============================================================================
-- Trigger: Update timestamp on modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ollama_model_pulls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ollama_model_pulls_updated_at ON ollama_model_pulls;
CREATE TRIGGER tr_ollama_model_pulls_updated_at
    BEFORE UPDATE ON ollama_model_pulls
    FOR EACH ROW
    EXECUTE FUNCTION update_ollama_model_pulls_updated_at();

CREATE OR REPLACE FUNCTION update_ollama_model_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ollama_model_info_updated_at ON ollama_model_info;
CREATE TRIGGER tr_ollama_model_info_updated_at
    BEFORE UPDATE ON ollama_model_info
    FOR EACH ROW
    EXECUTE FUNCTION update_ollama_model_info_updated_at();

-- ============================================================================
-- Helper function to extract model family from name
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_model_family(model_name TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Extract the base model name before any tag or version
    RETURN split_part(split_part(model_name, ':', 1), '-', 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_model_family(TEXT) IS 'Extracts model family from full model name';

-- ============================================================================
-- Trigger to auto-populate model family
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_model_family()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.model_family IS NULL AND NEW.model_name IS NOT NULL THEN
        NEW.model_family := extract_model_family(NEW.model_name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ollama_model_pulls_family ON ollama_model_pulls;
CREATE TRIGGER tr_ollama_model_pulls_family
    BEFORE INSERT OR UPDATE ON ollama_model_pulls
    FOR EACH ROW
    EXECUTE FUNCTION populate_model_family();

DROP TRIGGER IF EXISTS tr_ollama_model_info_family ON ollama_model_info;
CREATE TRIGGER tr_ollama_model_info_family
    BEFORE INSERT OR UPDATE ON ollama_model_info
    FOR EACH ROW
    EXECUTE FUNCTION populate_model_family();

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View: Model pull statistics
CREATE OR REPLACE VIEW ollama_pull_stats AS
SELECT 
    model_name,
    model_family,
    base_url,
    COUNT(*) as total_pulls,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_pulls,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_pulls,
    ROUND(AVG(duration_seconds)::numeric, 2) as avg_duration_seconds,
    ROUND(AVG(total_bytes)::numeric / 1024 / 1024 / 1024, 2) as avg_size_gb,
    MAX(completed_at) as last_pulled_at
FROM ollama_model_pulls
GROUP BY model_name, model_family, base_url
ORDER BY total_pulls DESC;

COMMENT ON VIEW ollama_pull_stats IS 'Model pull statistics by model and server';

-- View: Pull activity by day
CREATE OR REPLACE VIEW ollama_daily_pulls AS
SELECT 
    DATE(started_at) as pull_date,
    COUNT(*) as total_pulls,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(DISTINCT model_name) as unique_models,
    ROUND(SUM(total_bytes)::numeric / 1024 / 1024 / 1024, 2) as total_downloaded_gb
FROM ollama_model_pulls
GROUP BY DATE(started_at)
ORDER BY pull_date DESC;

COMMENT ON VIEW ollama_daily_pulls IS 'Daily model pull activity';

-- View: Popular models
CREATE OR REPLACE VIEW ollama_popular_models AS
SELECT 
    model_name,
    model_family,
    supports_tools,
    supports_vision,
    usage_count,
    context_length,
    ROUND(size_bytes::numeric / 1024 / 1024 / 1024, 2) as size_gb,
    last_used_at
FROM ollama_model_info
ORDER BY usage_count DESC
LIMIT 50;

COMMENT ON VIEW ollama_popular_models IS 'Top 50 most used Ollama models';

-- View: Model capabilities summary
CREATE OR REPLACE VIEW ollama_model_capabilities AS
SELECT 
    model_family,
    COUNT(*) as model_count,
    COUNT(*) FILTER (WHERE supports_tools) as with_tools,
    COUNT(*) FILTER (WHERE supports_vision) as with_vision,
    ROUND(AVG(context_length)::numeric, 0) as avg_context_length,
    SUM(usage_count) as total_usage
FROM ollama_model_info
GROUP BY model_family
ORDER BY total_usage DESC;

COMMENT ON VIEW ollama_model_capabilities IS 'Model capabilities summary by family';
