-- ============================================================================
-- Second Brain Database - Note Version Image Tracking
-- ============================================================================
-- Adds 'image_ids' column to note_versions table to track which images
-- were attached to a note at each version.
-- ============================================================================

-- Add image_ids column to note_versions (TEXT[] for storing image IDs)
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS image_ids TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN note_versions.image_ids IS 'IDs of images attached to the note at this version';

-- Create index for querying versions by image ID (if needed for auditing)
CREATE INDEX IF NOT EXISTS idx_note_versions_image_ids
ON note_versions USING GIN (image_ids);

-- Update the create_note_version function to include image_ids parameter
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
    p_content_format INTEGER DEFAULT 0,
    p_image_ids TEXT[] DEFAULT '{}'
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
        image_ids,
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
        p_image_ids,
        v_now
    );

    RETURN v_new_version_number;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing versions with current image IDs from notes
-- This updates existing versions to have the current image IDs (best effort)
DO $$
BEGIN
    UPDATE note_versions nv
    SET image_ids = COALESCE(
        (SELECT ARRAY_AGG(ni.id ORDER BY ni.image_index)
         FROM note_images ni
         WHERE ni.note_id = nv.note_id),
        '{}'
    )
    WHERE nv.image_ids IS NULL OR nv.image_ids = '{}';

    RAISE NOTICE 'Backfilled image_ids for existing note versions';
END $$;

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Note version image tracking migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added image_ids column (TEXT[]) to note_versions table';
    RAISE NOTICE '  - Added GIN index for image_ids for efficient querying';
    RAISE NOTICE '  - Updated create_note_version function with image_ids parameter';
    RAISE NOTICE '  - Backfilled existing versions with current note images';
    RAISE NOTICE '============================================';
END $$;
