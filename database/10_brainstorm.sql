-- ============================================================================
-- Second Brain Database - Brainstorm Tables
-- ============================================================================
-- Tables: brainstorm_sessions, brainstorm_results
-- Relationships:
--   - brainstorm_results -> brainstorm_sessions (cascade delete)
-- ============================================================================

-- Brainstorm sessions table - stores brainstorming sessions
CREATE TABLE IF NOT EXISTS brainstorm_sessions (
    id TEXT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    prompt TEXT NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Brainstorm results table - stores AI-generated brainstorm outputs
CREATE TABLE IF NOT EXISTS brainstorm_results (
    id TEXT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    result_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms DOUBLE PRECISION,
    output_tokens INTEGER,
    
    -- Foreign key constraint
    CONSTRAINT fk_brainstorm_results_session
        FOREIGN KEY (session_id)
        REFERENCES brainstorm_sessions(id)
        ON DELETE CASCADE
);

-- Create indexes for brainstorm tables
CREATE INDEX IF NOT EXISTS ix_brainstorm_sessions_user_id
    ON brainstorm_sessions (user_id);

CREATE INDEX IF NOT EXISTS ix_brainstorm_sessions_created_at
    ON brainstorm_sessions (created_at);

CREATE INDEX IF NOT EXISTS ix_brainstorm_results_session_id
    ON brainstorm_results (session_id);

CREATE INDEX IF NOT EXISTS ix_brainstorm_results_type
    ON brainstorm_results (result_type);

-- Add comments for documentation
COMMENT ON TABLE brainstorm_sessions IS 'Brainstorming sessions for multi-model idea generation';
COMMENT ON COLUMN brainstorm_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN brainstorm_sessions.title IS 'Session title';
COMMENT ON COLUMN brainstorm_sessions.prompt IS 'User prompt for brainstorming';
COMMENT ON COLUMN brainstorm_sessions.user_id IS 'Owner user ID';

COMMENT ON TABLE brainstorm_results IS 'AI-generated results from brainstorming sessions';
COMMENT ON COLUMN brainstorm_results.session_id IS 'Reference to the parent brainstorm session';
COMMENT ON COLUMN brainstorm_results.provider IS 'AI provider that generated this result';
COMMENT ON COLUMN brainstorm_results.model IS 'AI model that generated this result';
COMMENT ON COLUMN brainstorm_results.content IS 'Generated content from the AI model';
COMMENT ON COLUMN brainstorm_results.result_type IS 'Type of result (e.g., initial, refinement)';
COMMENT ON COLUMN brainstorm_results.duration_ms IS 'Time taken to generate response in milliseconds';
COMMENT ON COLUMN brainstorm_results.output_tokens IS 'Number of tokens in the generated output';


