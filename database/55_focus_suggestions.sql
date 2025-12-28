-- ============================================
-- Focus Suggestions Table
-- Persists AI-generated focus suggestions with
-- vector embeddings for semantic deduplication
-- ============================================

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS focus_suggestions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Suggestion content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    estimated_minutes INTEGER,
    reason TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),

    -- Source tracking
    source_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
    source_note_title VARCHAR(500),

    -- Vector embedding for deduplication (variable dimensions based on provider)
    -- OpenAI: 1536, Gemini: 768/1536/3072, Cohere: 1024, Ollama: varies
    embedding vector,
    embedding_provider VARCHAR(50),
    embedding_model VARCHAR(100),
    embedding_dimensions INTEGER NOT NULL DEFAULT 1536,

    -- Acceptance tracking (when converted to FocusItem)
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_focus_item_id TEXT REFERENCES focus_items(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(128)
);

-- ============================================
-- Indexes
-- ============================================

-- Primary user lookup index (most common query pattern)
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_user
ON focus_suggestions (user_id, created_at DESC)
WHERE is_deleted = FALSE;

-- Index for pending (non-accepted) suggestions
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_pending
ON focus_suggestions (user_id)
WHERE is_deleted = FALSE AND accepted_at IS NULL;

-- Index for source note lookups
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_source_note
ON focus_suggestions (source_note_id)
WHERE source_note_id IS NOT NULL AND is_deleted = FALSE;

-- Index on embedding_dimensions for filtering
-- Used to filter by dimension before vector similarity comparisons
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_dimensions
ON focus_suggestions(embedding_dimensions)
WHERE is_deleted = FALSE;

-- Note: Dimension-specific HNSW vector indexes can be created once data exists.
-- For small tables like focus_suggestions (typically dozens of rows per user),
-- queries work efficiently without dedicated vector indexes.
-- If needed, create dimension-specific indexes like:
--   CREATE INDEX ix_focus_suggestions_embedding_1024
--   ON focus_suggestions USING hnsw (embedding vector_cosine_ops)
--   WHERE is_deleted = FALSE AND embedding IS NOT NULL AND embedding_dimensions = 1024;

-- Index for accepted suggestions lookup
CREATE INDEX IF NOT EXISTS ix_focus_suggestions_accepted
ON focus_suggestions (user_id, accepted_at DESC)
WHERE is_deleted = FALSE AND accepted_at IS NOT NULL;

-- ============================================
-- Trigger for auto-updating updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_focus_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_focus_suggestions_updated_at ON focus_suggestions;
CREATE TRIGGER trigger_focus_suggestions_updated_at
    BEFORE UPDATE ON focus_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_focus_suggestions_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE focus_suggestions IS 'AI-generated focus suggestions with embeddings for semantic deduplication';
COMMENT ON COLUMN focus_suggestions.embedding IS 'Vector embedding (variable dimensions) for semantic similarity detection during deduplication';
COMMENT ON COLUMN focus_suggestions.confidence IS 'AI confidence score for this suggestion (0-1)';
COMMENT ON COLUMN focus_suggestions.accepted_at IS 'Timestamp when user converted this suggestion to a FocusItem';
COMMENT ON COLUMN focus_suggestions.accepted_focus_item_id IS 'ID of the FocusItem created from this suggestion';
COMMENT ON COLUMN focus_suggestions.reason IS 'AI-generated explanation for why this was suggested';
