-- ============================================================================
-- Second Brain Database - Summary Jobs Table
-- ============================================================================
-- Table: summary_jobs
-- Tracks background summary generation jobs for notes
-- ============================================================================

-- Summary jobs table - tracks AI summary generation progress
CREATE TABLE IF NOT EXISTS summary_jobs (
    id TEXT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    total_notes INTEGER NOT NULL DEFAULT 0,
    processed_notes INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    errors TEXT[] NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS ix_summary_jobs_user_id ON summary_jobs(user_id);

-- Index for status lookups (finding active jobs)
CREATE INDEX IF NOT EXISTS ix_summary_jobs_status ON summary_jobs(status);

-- Composite index for finding active jobs by user
CREATE INDEX IF NOT EXISTS ix_summary_jobs_user_status ON summary_jobs(user_id, status);

-- Add comments for documentation
COMMENT ON TABLE summary_jobs IS 'Tracks background AI summary generation jobs for notes';
COMMENT ON COLUMN summary_jobs.status IS 'Job status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN summary_jobs.total_notes IS 'Total number of notes to process';
COMMENT ON COLUMN summary_jobs.processed_notes IS 'Number of notes processed so far';
COMMENT ON COLUMN summary_jobs.success_count IS 'Number of notes successfully summarized';
COMMENT ON COLUMN summary_jobs.failure_count IS 'Number of notes that failed to summarize';
COMMENT ON COLUMN summary_jobs.skipped_count IS 'Number of notes skipped (already had summary)';
COMMENT ON COLUMN summary_jobs.errors IS 'Array of error messages encountered';
COMMENT ON COLUMN summary_jobs.started_at IS 'When the job started processing';
COMMENT ON COLUMN summary_jobs.completed_at IS 'When the job finished (success or failure)';
