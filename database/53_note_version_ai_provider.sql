-- ============================================================================
-- Second Brain Database - Note Version AI Provider Tracking
-- ============================================================================
-- Adds 'ai_provider' and 'ai_model' columns to note_versions table to track
-- which AI provider/model created or modified notes via agent operations.
-- ============================================================================

-- Add AI provider and model columns to note_versions
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);

-- Add comments
COMMENT ON COLUMN note_versions.ai_provider IS 'AI provider name when created/modified by an agent (e.g., Anthropic, Google, OpenAI)';
COMMENT ON COLUMN note_versions.ai_model IS 'AI model identifier when created/modified by an agent (e.g., claude-3-5-sonnet, gemini-2.0-flash)';

-- Create index for querying versions by AI provider (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_note_versions_ai_provider
ON note_versions(ai_provider) WHERE ai_provider IS NOT NULL;

-- Update the create_note_version function to include ai_provider and ai_model parameters
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
    p_image_ids TEXT[] DEFAULT '{}',
    p_ai_provider VARCHAR(50) DEFAULT NULL,
    p_ai_model VARCHAR(100) DEFAULT NULL
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
        ai_provider,
        ai_model,
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
        p_ai_provider,
        p_ai_model,
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
    RAISE NOTICE 'Note version AI provider tracking migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added ai_provider column (VARCHAR(50)) to note_versions table';
    RAISE NOTICE '  - Added ai_model column (VARCHAR(100)) to note_versions table';
    RAISE NOTICE '  - Added partial index for ai_provider for analytics queries';
    RAISE NOTICE '  - Updated create_note_version function with ai_provider/ai_model params';
    RAISE NOTICE '============================================';
END $$;
