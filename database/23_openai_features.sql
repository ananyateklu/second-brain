-- ============================================================================
-- Second Brain Database - OpenAI Features
-- ============================================================================
-- This migration adds support for OpenAI-specific features:
--   - Audio transcriptions (Whisper)
--   - Content moderation logs
-- ============================================================================

-- ============================================================================
-- Table: audio_transcriptions
-- Stores Whisper audio transcription results
-- ============================================================================

CREATE TABLE IF NOT EXISTS audio_transcriptions (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User who requested the transcription
    user_id VARCHAR(128) NOT NULL,
    
    -- Optional reference to a note if transcription was saved as a note
    note_id VARCHAR(128),
    
    -- Optional reference to a chat message if used in conversation
    message_id VARCHAR(128),
    
    -- Original file name
    file_name VARCHAR(256),
    
    -- File size in bytes
    file_size_bytes INTEGER,
    
    -- Audio duration in seconds
    duration_seconds REAL,
    
    -- The transcribed text
    text TEXT NOT NULL,
    
    -- Detected or specified language code (e.g., 'en', 'es', 'fr')
    language VARCHAR(10),
    
    -- Word-level timestamps as JSON array
    -- Format: [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
    words_json JSONB,
    
    -- Segment-level data as JSON array
    -- Format: [{"id": 0, "start": 0.0, "end": 5.0, "text": "..."}, ...]
    segments_json JSONB,
    
    -- The Whisper model used (e.g., 'whisper-1')
    model VARCHAR(64) DEFAULT 'whisper-1',
    
    -- Response format used (verbose, text, srt, vtt, json)
    response_format VARCHAR(32),
    
    -- Processing time in milliseconds
    processing_time_ms INTEGER,
    
    -- Timestamp when the transcription was created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE audio_transcriptions IS 'Stores Whisper audio transcription results';
COMMENT ON COLUMN audio_transcriptions.file_name IS 'Original audio file name';
COMMENT ON COLUMN audio_transcriptions.duration_seconds IS 'Audio duration in seconds';
COMMENT ON COLUMN audio_transcriptions.text IS 'Full transcribed text';
COMMENT ON COLUMN audio_transcriptions.language IS 'Detected or specified language code';
COMMENT ON COLUMN audio_transcriptions.words_json IS 'Word-level timestamps as JSON array';
COMMENT ON COLUMN audio_transcriptions.segments_json IS 'Segment-level data with timestamps as JSON array';

-- ============================================================================
-- Indexes for audio_transcriptions
-- ============================================================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_user_id 
    ON audio_transcriptions(user_id);

-- Index for note association
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_note_id 
    ON audio_transcriptions(note_id) 
    WHERE note_id IS NOT NULL;

-- Index for message association
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_message_id 
    ON audio_transcriptions(message_id) 
    WHERE message_id IS NOT NULL;

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_created_at 
    ON audio_transcriptions(created_at DESC);

-- Index for language analytics
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_language 
    ON audio_transcriptions(language);

-- Full-text search on transcription text
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_text_search 
    ON audio_transcriptions USING GIN(to_tsvector('english', text));

-- GIN index for word-level queries
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_words_gin 
    ON audio_transcriptions USING GIN(words_json jsonb_path_ops) 
    WHERE words_json IS NOT NULL;

-- ============================================================================
-- Table: moderation_logs
-- Stores OpenAI content moderation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_logs (
    -- Primary key using UUID
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- User whose content was moderated (optional for system moderation)
    user_id VARCHAR(128),
    
    -- Optional reference to a chat message
    message_id VARCHAR(128),
    
    -- Optional reference to a conversation
    conversation_id VARCHAR(128),
    
    -- SHA-256 hash of the moderated content (for deduplication)
    content_hash VARCHAR(64) NOT NULL,
    
    -- Length of the original content in characters
    content_length INTEGER,
    
    -- Whether the content was flagged
    flagged BOOLEAN NOT NULL,
    
    -- Category flags as JSON object
    -- Format: {"hate": false, "harassment": true, ...}
    categories JSONB NOT NULL,
    
    -- Category confidence scores as JSON object
    -- Format: {"hate": 0.001, "harassment": 0.85, ...}
    category_scores JSONB NOT NULL,
    
    -- The moderation model used
    model VARCHAR(64) DEFAULT 'omni-moderation-latest',
    
    -- Whether the content was blocked based on moderation
    was_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Action taken: none, warned, blocked
    action_taken VARCHAR(32) DEFAULT 'none',
    
    -- Content type: input (user message), output (AI response), note
    content_type VARCHAR(32) DEFAULT 'input',
    
    -- Timestamp when the moderation was performed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE moderation_logs IS 'Stores OpenAI content moderation results for safety monitoring';
COMMENT ON COLUMN moderation_logs.content_hash IS 'SHA-256 hash of content for deduplication (content not stored for privacy)';
COMMENT ON COLUMN moderation_logs.flagged IS 'Whether the content was flagged by any category';
COMMENT ON COLUMN moderation_logs.categories IS 'JSON object with boolean flags for each moderation category';
COMMENT ON COLUMN moderation_logs.category_scores IS 'JSON object with confidence scores (0-1) for each category';
COMMENT ON COLUMN moderation_logs.was_blocked IS 'Whether the content was blocked based on moderation settings';
COMMENT ON COLUMN moderation_logs.content_type IS 'Type of content: input (user message), output (AI response), note';

-- ============================================================================
-- Indexes for moderation_logs
-- ============================================================================

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id 
    ON moderation_logs(user_id) 
    WHERE user_id IS NOT NULL;

-- Index for message association
CREATE INDEX IF NOT EXISTS idx_moderation_logs_message_id 
    ON moderation_logs(message_id) 
    WHERE message_id IS NOT NULL;

-- Index for conversation lookup
CREATE INDEX IF NOT EXISTS idx_moderation_logs_conversation_id 
    ON moderation_logs(conversation_id) 
    WHERE conversation_id IS NOT NULL;

-- Index for flagged content (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_flagged 
    ON moderation_logs(flagged, created_at DESC) 
    WHERE flagged = true;

-- Index for blocked content
CREATE INDEX IF NOT EXISTS idx_moderation_logs_blocked 
    ON moderation_logs(was_blocked, created_at DESC) 
    WHERE was_blocked = true;

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at 
    ON moderation_logs(created_at DESC);

-- Index for content type analytics
CREATE INDEX IF NOT EXISTS idx_moderation_logs_content_type 
    ON moderation_logs(content_type);

-- GIN index for category queries (e.g., find all harassment flags)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_categories_gin 
    ON moderation_logs USING GIN(categories jsonb_path_ops);

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View: Transcription statistics
CREATE OR REPLACE VIEW audio_transcription_stats AS
SELECT 
    language,
    model,
    COUNT(*) as total_transcriptions,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(duration_seconds)::numeric, 2) as avg_duration_seconds,
    ROUND(SUM(duration_seconds)::numeric, 2) as total_duration_seconds,
    ROUND(AVG(processing_time_ms)::numeric, 2) as avg_processing_time_ms
FROM audio_transcriptions
GROUP BY language, model
ORDER BY total_transcriptions DESC;

COMMENT ON VIEW audio_transcription_stats IS 'Aggregated statistics for audio transcriptions by language and model';

-- View: Moderation statistics
CREATE OR REPLACE VIEW moderation_stats AS
SELECT 
    content_type,
    model,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE flagged) as flagged_count,
    COUNT(*) FILTER (WHERE was_blocked) as blocked_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE flagged) / NULLIF(COUNT(*), 0), 2) as flag_rate_percent
FROM moderation_logs
GROUP BY content_type, model
ORDER BY total_checks DESC;

COMMENT ON VIEW moderation_stats IS 'Aggregated statistics for content moderation';

-- View: Moderation category breakdown
CREATE OR REPLACE VIEW moderation_category_stats AS
SELECT 
    key as category,
    COUNT(*) FILTER (WHERE (categories->>key)::boolean = true) as flagged_count,
    ROUND(AVG((category_scores->>key)::numeric)::numeric, 4) as avg_score,
    MAX((category_scores->>key)::numeric) as max_score
FROM moderation_logs,
LATERAL jsonb_object_keys(categories) as key
GROUP BY key
ORDER BY flagged_count DESC;

COMMENT ON VIEW moderation_category_stats IS 'Breakdown of moderation flags by category';

-- View: Daily moderation activity
CREATE OR REPLACE VIEW moderation_daily_stats AS
SELECT 
    DATE(created_at) as moderation_date,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE flagged) as flagged_count,
    COUNT(*) FILTER (WHERE was_blocked) as blocked_count,
    COUNT(DISTINCT user_id) as unique_users
FROM moderation_logs
GROUP BY DATE(created_at)
ORDER BY moderation_date DESC;

COMMENT ON VIEW moderation_daily_stats IS 'Daily content moderation activity';
