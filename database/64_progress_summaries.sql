-- =============================================
-- Progress Summaries Table
-- Caches AI-generated progress summaries to reduce API costs
-- Only regenerated when tasks are completed or user forces refresh
-- =============================================

-- Create progress_summaries table
-- Note: ID is generated in application code using UuidV7.NewId()
CREATE TABLE IF NOT EXISTS progress_summaries (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- The date this summary is for
    summary_date DATE NOT NULL,

    -- Period type: 'today' or 'week'
    period VARCHAR(20) NOT NULL DEFAULT 'today',

    -- Statistics (cached)
    total_completed INTEGER NOT NULL DEFAULT 0,
    total_minutes_tracked INTEGER NOT NULL DEFAULT 0,
    p1_completed INTEGER NOT NULL DEFAULT 0,
    p2_completed INTEGER NOT NULL DEFAULT 0,
    p3_completed INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,

    -- AI-generated content
    summary TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    encouragement TEXT,

    -- Generation metadata
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Period boundaries
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one summary per user/date/period combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_summaries_user_date_period
    ON progress_summaries(user_id, summary_date, period);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_progress_summaries_user_date
    ON progress_summaries(user_id, summary_date DESC);

-- Index for cleanup of old summaries
CREATE INDEX IF NOT EXISTS idx_progress_summaries_created_at
    ON progress_summaries(created_at);

-- Comment on table
COMMENT ON TABLE progress_summaries IS 'Cached AI-generated progress summaries for the focus dashboard. Reduces API costs by caching summaries until task completion or manual refresh.';

COMMENT ON COLUMN progress_summaries.summary_date IS 'The date this summary is for (in user local time)';
COMMENT ON COLUMN progress_summaries.period IS 'Summary period type: today or week';
COMMENT ON COLUMN progress_summaries.highlights IS 'JSON array of highlight strings from AI';
COMMENT ON COLUMN progress_summaries.generated_at IS 'When the AI generated this summary';
