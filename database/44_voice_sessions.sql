-- ============================================================================
-- Second Brain Database - Voice Sessions Tables
-- ============================================================================
-- Tables: voice_sessions, voice_turns
-- Purpose: Persist voice conversation sessions and individual turns for
--          analytics, history, and potential playback/review.
-- ============================================================================

-- Voice Sessions table - tracks full voice conversation lifecycle
CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id VARCHAR(128) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    options_json JSONB,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_audio_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Voice Turns table - individual conversation turns within a session
CREATE TABLE IF NOT EXISTS voice_turns (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    transcript_text TEXT,
    audio_url VARCHAR(2048),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    input_tokens INTEGER,
    output_tokens INTEGER,
    audio_duration_ms INTEGER,
    tool_calls_json JSONB
);

-- ============================================================================
-- Indexes for Voice Sessions
-- ============================================================================

-- User lookup for session history
CREATE INDEX IF NOT EXISTS ix_voice_sessions_user_id
    ON voice_sessions(user_id);

-- Filter by status (find active sessions)
CREATE INDEX IF NOT EXISTS ix_voice_sessions_status
    ON voice_sessions(status);

-- Sort by start time descending (recent sessions first)
CREATE INDEX IF NOT EXISTS ix_voice_sessions_started_at
    ON voice_sessions(started_at DESC);

-- Composite index for user session history listing
CREATE INDEX IF NOT EXISTS ix_voice_sessions_user_started
    ON voice_sessions(user_id, started_at DESC);

-- ============================================================================
-- Indexes for Voice Turns
-- ============================================================================

-- Session lookup for turns
CREATE INDEX IF NOT EXISTS ix_voice_turns_session_id
    ON voice_turns(session_id);

-- Sort by timestamp
CREATE INDEX IF NOT EXISTS ix_voice_turns_timestamp
    ON voice_turns(timestamp);

-- Composite index for ordered turns within a session
CREATE INDEX IF NOT EXISTS ix_voice_turns_session_timestamp
    ON voice_turns(session_id, timestamp);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE voice_sessions IS 'Voice conversation sessions between users and AI assistants';
COMMENT ON COLUMN voice_sessions.id IS 'UUIDv7 primary key for time-ordered sessions';
COMMENT ON COLUMN voice_sessions.user_id IS 'User who initiated the voice session';
COMMENT ON COLUMN voice_sessions.provider IS 'AI provider used (e.g., OpenAI, Grok, ElevenLabs)';
COMMENT ON COLUMN voice_sessions.model IS 'AI model used (e.g., gpt-4o-realtime, grok-beta)';
COMMENT ON COLUMN voice_sessions.started_at IS 'When the session started';
COMMENT ON COLUMN voice_sessions.ended_at IS 'When the session ended (null if active)';
COMMENT ON COLUMN voice_sessions.status IS 'Session status: active, ended, error';
COMMENT ON COLUMN voice_sessions.options_json IS 'JSON serialized session options (voice settings, system prompt, etc.)';
COMMENT ON COLUMN voice_sessions.total_input_tokens IS 'Total input tokens used across all turns';
COMMENT ON COLUMN voice_sessions.total_output_tokens IS 'Total output tokens used across all turns';
COMMENT ON COLUMN voice_sessions.total_audio_duration_ms IS 'Total audio duration in milliseconds';

COMMENT ON TABLE voice_turns IS 'Individual turns (user speech or assistant response) within a voice session';
COMMENT ON COLUMN voice_turns.id IS 'UUIDv7 primary key for time-ordered turns';
COMMENT ON COLUMN voice_turns.session_id IS 'Reference to parent voice session';
COMMENT ON COLUMN voice_turns.role IS 'Speaker role: user or assistant';
COMMENT ON COLUMN voice_turns.content IS 'Text content of the turn';
COMMENT ON COLUMN voice_turns.transcript_text IS 'Transcribed text from audio (speech-to-text result)';
COMMENT ON COLUMN voice_turns.audio_url IS 'URL to stored audio file if applicable';
COMMENT ON COLUMN voice_turns.timestamp IS 'When this turn occurred';
COMMENT ON COLUMN voice_turns.input_tokens IS 'Input tokens for this turn (assistant turns)';
COMMENT ON COLUMN voice_turns.output_tokens IS 'Output tokens for this turn (assistant turns)';
COMMENT ON COLUMN voice_turns.audio_duration_ms IS 'Duration of audio in milliseconds';
COMMENT ON COLUMN voice_turns.tool_calls_json IS 'JSON serialized tool calls made during this turn';

-- ============================================================================
-- Migration completion notification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Voice sessions migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - voice_sessions: Voice conversation sessions';
    RAISE NOTICE '  - voice_turns: Individual turns within sessions';
    RAISE NOTICE '';
    RAISE NOTICE 'Status values:';
    RAISE NOTICE '  - active: Session is currently active';
    RAISE NOTICE '  - ended: Session ended normally';
    RAISE NOTICE '  - error: Session ended due to an error';
    RAISE NOTICE '';
    RAISE NOTICE 'Role values:';
    RAISE NOTICE '  - user: User speech input';
    RAISE NOTICE '  - assistant: AI voice response';
    RAISE NOTICE '============================================';
END $$;
