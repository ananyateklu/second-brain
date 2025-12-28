-- ============================================
-- Focus Items Table
-- Supports productivity-focused task management
-- with single focus + priority levels (P1/P2/P3)
-- ============================================

-- Create focus_items table
CREATE TABLE IF NOT EXISTS focus_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Link to note (optional - allows standalone focus items)
    note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,

    -- Item content
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Focus and priority
    is_current_focus BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1=P1(High), 2=P2(Medium), 3=P3(Low)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred')),

    -- Scheduling
    scheduled_date DATE,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    deferred_to DATE,

    -- AI suggestion metadata
    ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    ai_suggestion_reason TEXT,
    ai_confidence REAL CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

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

-- Ensure only one current focus per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS ix_focus_items_current_focus
ON focus_items (user_id)
WHERE is_current_focus = TRUE AND is_deleted = FALSE;

-- Primary query: Today's plan ordered by priority and sort order
CREATE INDEX IF NOT EXISTS ix_focus_items_scheduled
ON focus_items (user_id, scheduled_date, priority, sort_order)
WHERE is_deleted = FALSE;

-- Backlog query: Non-scheduled items by priority
CREATE INDEX IF NOT EXISTS ix_focus_items_backlog
ON focus_items (user_id, priority, sort_order)
WHERE scheduled_date IS NULL AND is_deleted = FALSE AND status != 'completed';

-- Status-based queries
CREATE INDEX IF NOT EXISTS ix_focus_items_status
ON focus_items (user_id, status, updated_at DESC)
WHERE is_deleted = FALSE;

-- AI suggestions tracking
CREATE INDEX IF NOT EXISTS ix_focus_items_ai_suggestions
ON focus_items (user_id, ai_suggested, created_at DESC)
WHERE is_deleted = FALSE;

-- Note linkage
CREATE INDEX IF NOT EXISTS ix_focus_items_note
ON focus_items (note_id)
WHERE note_id IS NOT NULL AND is_deleted = FALSE;

-- ============================================
-- Trigger for updated_at
-- ============================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_focus_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_focus_items_updated_at ON focus_items;
CREATE TRIGGER trigger_focus_items_updated_at
    BEFORE UPDATE ON focus_items
    FOR EACH ROW
    EXECUTE FUNCTION update_focus_items_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE focus_items IS 'Productivity-focused task items with single focus and priority levels';
COMMENT ON COLUMN focus_items.priority IS '1=P1(High priority), 2=P2(Medium), 3=P3(Low)';
COMMENT ON COLUMN focus_items.is_current_focus IS 'Only one item per user can have this set to true';
COMMENT ON COLUMN focus_items.scheduled_date IS 'Date when this item is planned (null = backlog)';
COMMENT ON COLUMN focus_items.ai_suggested IS 'True if this item was suggested by AI based on user notes';
COMMENT ON COLUMN focus_items.ai_confidence IS 'Confidence score (0-1) for AI-suggested items';
