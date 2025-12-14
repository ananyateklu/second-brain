-- ============================================================================
-- Second Brain Database - Note Version Content JSON Support
-- ============================================================================
-- Adds 'content_json' and 'content_format' columns to note_versions table
-- to support TipTap JSON as the canonical format for version comparison
-- ============================================================================

-- Add content_json column to note_versions (JSONB for TipTap JSON)
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Add content_format column to note_versions
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS content_format INTEGER NOT NULL DEFAULT 0;

-- Add comments
COMMENT ON COLUMN note_versions.content_json IS 'TipTap/ProseMirror JSON representation of the note content at this version';
COMMENT ON COLUMN note_versions.content_format IS 'Content format: 0=Markdown, 1=Html, 2=TipTapJson';

-- Update the create_note_version function to include content_json and content_format
CREATE OR REPLACE FUNCTION create_note_version(
    p_note_id TEXT,
    p_title VARCHAR(500),
    p_content TEXT,
    p_tags TEXT[],
    p_is_archived BOOLEAN,
    p_folder VARCHAR(256),
    p_modified_by VARCHAR(128),
    p_change_summary VARCHAR(500) DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'web',
    p_content_json JSONB DEFAULT NULL,
    p_content_format INTEGER DEFAULT 0
)
RETURNS INT AS $$
DECLARE
    v_new_version_number INT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_new_version_number
    FROM note_versions
    WHERE note_id = p_note_id;

    -- Close the current version (set end time)
    UPDATE note_versions
    SET valid_period = tstzrange(lower(valid_period), v_now, '[)')
    WHERE note_id = p_note_id
      AND upper_inf(valid_period);

    -- Insert the new version
    INSERT INTO note_versions (
        id,
        note_id,
        valid_period,
        title,
        content,
        content_json,
        content_format,
        tags,
        is_archived,
        folder,
        modified_by,
        version_number,
        change_summary,
        source,
        created_at
    ) VALUES (
        gen_random_uuid()::text,
        p_note_id,
        tstzrange(v_now, NULL, '[)'),
        p_title,
        p_content,
        p_content_json,
        p_content_format,
        p_tags,
        p_is_archived,
        p_folder,
        p_modified_by,
        v_new_version_number,
        p_change_summary,
        p_source,
        v_now
    );

    RETURN v_new_version_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Note version content JSON migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added content_json column (JSONB) to note_versions table';
    RAISE NOTICE '  - Added content_format column to note_versions table';
    RAISE NOTICE '  - Updated create_note_version function with new parameters';
    RAISE NOTICE '';
    RAISE NOTICE 'ContentFormat values:';
    RAISE NOTICE '  - 0: Markdown';
    RAISE NOTICE '  - 1: Html';
    RAISE NOTICE '  - 2: TipTapJson';
    RAISE NOTICE '============================================';
END $$;
