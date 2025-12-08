-- ============================================================================
-- Second Brain Database - Note Summaries
-- ============================================================================
-- Migration: 27_note_summaries.sql
-- Purpose: Add AI-generated summary field to notes table for optimized list endpoint
-- ============================================================================

-- Add summary column to notes table
-- This stores an AI-generated summary of the note (considering title, tags, and content)
-- Used by the list endpoint to avoid fetching full content
ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN notes.summary IS 'AI-generated summary of note (title, tags, content) for list views';

-- Create index for notes without summaries (for backfill queries)
CREATE INDEX IF NOT EXISTS idx_notes_summary_null 
    ON notes (user_id) 
    WHERE summary IS NULL AND is_deleted = FALSE;

-- ============================================================================
-- Rollback script (if needed):
-- ALTER TABLE notes DROP COLUMN IF EXISTS summary;
-- DROP INDEX IF EXISTS idx_notes_summary_null;
-- ============================================================================
