-- ============================================================================
-- Second Brain Database - Note Version Source Tracking
-- ============================================================================
-- Adds 'source' column to note_versions table to track where each version
-- originated from (e.g., web UI, agent, iOS import)
-- ============================================================================

-- Add source column to note_versions
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'web';

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS ix_note_versions_source
ON note_versions(source);

-- Update comment
COMMENT ON COLUMN note_versions.source IS 'Source of this version change (web, agent, ios_notes, import)';

-- Update the helper functions to include source

-- Function to get the current version of a note (updated with source)
CREATE OR REPLACE FUNCTION get_current_note_version(p_note_id TEXT)
RETURNS TABLE (
    note_id TEXT,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    title VARCHAR(500),
    content TEXT,
    tags TEXT[],
    is_archived BOOLEAN,
    folder VARCHAR(256),
    modified_by VARCHAR(128),
    version_number INT,
    source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nv.note_id,
        lower(nv.valid_period) AS valid_from,
        upper(nv.valid_period) AS valid_to,
        nv.title,
        nv.content,
        nv.tags,
        nv.is_archived,
        nv.folder,
        nv.modified_by,
        nv.version_number,
        nv.source
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
      AND nv.valid_period @> NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get note version at a specific point in time (updated with source)
CREATE OR REPLACE FUNCTION get_note_version_at_time(
    p_note_id TEXT,
    p_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    note_id TEXT,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    title VARCHAR(500),
    content TEXT,
    tags TEXT[],
    is_archived BOOLEAN,
    folder VARCHAR(256),
    modified_by VARCHAR(128),
    version_number INT,
    source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nv.note_id,
        lower(nv.valid_period) AS valid_from,
        upper(nv.valid_period) AS valid_to,
        nv.title,
        nv.content,
        nv.tags,
        nv.is_archived,
        nv.folder,
        nv.modified_by,
        nv.version_number,
        nv.source
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
      AND nv.valid_period @> p_timestamp;
END;
$$ LANGUAGE plpgsql;

-- Function to get full version history of a note (updated with source)
CREATE OR REPLACE FUNCTION get_note_version_history(p_note_id TEXT)
RETURNS TABLE (
    note_id TEXT,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    title VARCHAR(500),
    content TEXT,
    tags TEXT[],
    is_archived BOOLEAN,
    folder VARCHAR(256),
    modified_by VARCHAR(128),
    version_number INT,
    change_summary VARCHAR(500),
    source VARCHAR(50),
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nv.note_id,
        lower(nv.valid_period) AS valid_from,
        upper(nv.valid_period) AS valid_to,
        nv.title,
        nv.content,
        nv.tags,
        nv.is_archived,
        nv.folder,
        nv.modified_by,
        nv.version_number,
        nv.change_summary,
        nv.source,
        upper_inf(nv.valid_period) AS is_current
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
    ORDER BY lower(nv.valid_period) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new note version (updated with source parameter)
CREATE OR REPLACE FUNCTION create_note_version(
    p_note_id TEXT,
    p_title VARCHAR(500),
    p_content TEXT,
    p_tags TEXT[],
    p_is_archived BOOLEAN,
    p_folder VARCHAR(256),
    p_modified_by VARCHAR(128),
    p_change_summary VARCHAR(500) DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'web'
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
    RAISE NOTICE 'Note version source tracking migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added source column to note_versions table';
    RAISE NOTICE '  - Added index on source column';
    RAISE NOTICE '  - Updated helper functions to include source';
    RAISE NOTICE '';
    RAISE NOTICE 'Source values:';
    RAISE NOTICE '  - web: Created/edited via web UI';
    RAISE NOTICE '  - agent: Created/edited by Agent';
    RAISE NOTICE '  - ios_notes: Imported from iOS Notes';
    RAISE NOTICE '  - import: Generic import source';
    RAISE NOTICE '============================================';
END $$;
