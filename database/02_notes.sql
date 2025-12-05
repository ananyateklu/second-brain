-- ============================================================================
-- Second Brain Database - Notes Table
-- ============================================================================
-- Table: notes
-- Stores user notes with tags, folders, and source tracking
-- ============================================================================

-- Notes table - stores user notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    user_id VARCHAR(128) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'web',
    external_id VARCHAR(256),
    folder VARCHAR(256),
    -- Soft delete columns
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(128)
);

-- Add comments for documentation
COMMENT ON TABLE notes IS 'User notes with content, tags, and metadata';
COMMENT ON COLUMN notes.id IS 'Unique note identifier';
COMMENT ON COLUMN notes.title IS 'Note title';
COMMENT ON COLUMN notes.content IS 'Note content (supports markdown)';
COMMENT ON COLUMN notes.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN notes.is_archived IS 'Whether the note is archived';
COMMENT ON COLUMN notes.user_id IS 'Owner user ID';
COMMENT ON COLUMN notes.source IS 'Note source (web, ios, import, etc.)';
COMMENT ON COLUMN notes.external_id IS 'External identifier for imported notes';
COMMENT ON COLUMN notes.folder IS 'Optional folder/category for organization';
COMMENT ON COLUMN notes.is_deleted IS 'Soft delete flag - when true, note is considered deleted';
COMMENT ON COLUMN notes.deleted_at IS 'Timestamp when the note was soft deleted';
COMMENT ON COLUMN notes.deleted_by IS 'User ID who deleted the note';

