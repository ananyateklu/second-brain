-- ============================================================================
-- Second Brain Database - TipTap JSON Content Storage
-- ============================================================================
-- Migration: 41_content_json_format.sql
-- Purpose: Add ContentJson field for storing TipTap/ProseMirror JSON format
--
-- This enables consistent note formatting between UI editing and agent creation.
-- The canonical format is TipTap JSON, which eliminates lossy format conversions.
-- ============================================================================

-- Add content_json column to notes table (JSONB for efficient storage and indexing)
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Add content_format enum column (0=Markdown, 1=Html, 2=TipTapJson)
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS content_format INTEGER NOT NULL DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN notes.content_json IS 'TipTap/ProseMirror JSON representation of note content - canonical format for UI editing';
COMMENT ON COLUMN notes.content_format IS 'Content format enum: 0=Markdown (legacy), 1=Html, 2=TipTapJson';

-- Add index on content_format for filtering by format (useful for migration queries)
CREATE INDEX IF NOT EXISTS idx_notes_content_format
ON notes (content_format)
WHERE content_format != 0;

-- Create a partial GIN index on content_json for notes that have it
-- This enables efficient JSON queries/filtering when needed
CREATE INDEX IF NOT EXISTS idx_notes_content_json
ON notes USING GIN (content_json jsonb_path_ops)
WHERE content_json IS NOT NULL;

-- ============================================================================
-- Add content_json to note_versions table (for temporal versioning)
-- ============================================================================

-- Check if note_versions table exists (from PostgreSQL 18 temporal features)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'note_versions') THEN
        -- Add content_json column to note_versions if it doesn't exist
        ALTER TABLE note_versions
        ADD COLUMN IF NOT EXISTS content_json JSONB;

        -- Add content_format column to note_versions if it doesn't exist
        ALTER TABLE note_versions
        ADD COLUMN IF NOT EXISTS content_format INTEGER NOT NULL DEFAULT 0;

        COMMENT ON COLUMN note_versions.content_json IS 'TipTap/ProseMirror JSON representation at this version';
        COMMENT ON COLUMN note_versions.content_format IS 'Content format enum at this version: 0=Markdown, 1=Html, 2=TipTapJson';
    END IF;
END $$;

-- ============================================================================
-- Verification query (can be run manually to check migration)
-- ============================================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'notes' AND column_name IN ('content_json', 'content_format');
