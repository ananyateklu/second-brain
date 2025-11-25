-- ============================================================================
-- Second Brain Database - Indexing Jobs Table
-- ============================================================================
-- Table: indexing_jobs
-- Tracks embedding generation jobs for notes
-- ============================================================================

-- Indexing jobs table - tracks embedding generation progress
CREATE TABLE IF NOT EXISTS indexing_jobs (
    id TEXT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    total_notes INTEGER NOT NULL DEFAULT 0,
    processed_notes INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    processed_chunks INTEGER NOT NULL DEFAULT 0,
    errors TEXT[] NOT NULL DEFAULT '{}',
    embedding_provider VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE indexing_jobs IS 'Tracks note embedding generation jobs';
COMMENT ON COLUMN indexing_jobs.status IS 'Job status: pending, running, completed, failed, partially_completed, cancelled';
COMMENT ON COLUMN indexing_jobs.total_notes IS 'Total number of notes to process';
COMMENT ON COLUMN indexing_jobs.processed_notes IS 'Number of notes processed so far';
COMMENT ON COLUMN indexing_jobs.total_chunks IS 'Total number of chunks to embed';
COMMENT ON COLUMN indexing_jobs.processed_chunks IS 'Number of chunks embedded so far';
COMMENT ON COLUMN indexing_jobs.errors IS 'Array of error messages encountered';
COMMENT ON COLUMN indexing_jobs.embedding_provider IS 'Provider used for generating embeddings';
COMMENT ON COLUMN indexing_jobs.started_at IS 'When the job started processing';
COMMENT ON COLUMN indexing_jobs.completed_at IS 'When the job finished (success or failure)';

