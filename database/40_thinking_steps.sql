-- Migration: Add thinking_steps table for persisting agent thinking with timestamps
-- This allows thinking steps to retain their individual timestamps after streaming ends

-- Create thinking_steps table
CREATE TABLE IF NOT EXISTS thinking_steps (
    id TEXT PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    step_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms DOUBLE PRECISION,
    model_source VARCHAR(50),

    CONSTRAINT fk_thinking_steps_messages
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

-- Index for efficient lookup by message
CREATE INDEX IF NOT EXISTS idx_thinking_steps_message_id
    ON thinking_steps(message_id);

-- Index for filtering by model source
CREATE INDEX IF NOT EXISTS idx_thinking_steps_model_source
    ON thinking_steps(model_source);

-- Composite index for ordering within a message
CREATE INDEX IF NOT EXISTS idx_thinking_steps_message_order
    ON thinking_steps(message_id, step_number);

COMMENT ON TABLE thinking_steps IS 'Stores AI thinking/reasoning steps with individual timestamps for display in chat timeline';
COMMENT ON COLUMN thinking_steps.step_number IS 'Order of this thinking step within the message (0-indexed)';
COMMENT ON COLUMN thinking_steps.started_at IS 'When this thinking step began (from streaming)';
COMMENT ON COLUMN thinking_steps.completed_at IS 'When this thinking step completed (null if still streaming)';
COMMENT ON COLUMN thinking_steps.model_source IS 'AI provider that generated this thinking (claude, grok, gemini, ollama, etc.)';
