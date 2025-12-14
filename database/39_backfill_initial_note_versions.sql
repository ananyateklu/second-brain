-- ============================================================================
-- Second Brain Database - Backfill Initial Note Versions
-- ============================================================================
-- Creates initial version history (version 1) for any notes that don't have
-- version history entries. This ensures all notes have a baseline version
-- that can be restored to.
-- ============================================================================

-- Function to backfill initial versions for notes without version history
CREATE OR REPLACE FUNCTION backfill_initial_note_versions()
RETURNS TABLE (
    notes_processed INT,
    versions_created INT
) AS $$
DECLARE
    v_notes_processed INT := 0;
    v_versions_created INT := 0;
    v_note RECORD;
BEGIN
    -- Find all notes that don't have any version history
    FOR v_note IN
        SELECT n.id, n.title, n.content, n.tags, n.is_archived, n.folder,
               n.user_id, n.source, n.created_at
        FROM notes n
        LEFT JOIN note_versions nv ON n.id = nv.note_id
        WHERE nv.id IS NULL
          AND n.is_deleted = FALSE
    LOOP
        v_notes_processed := v_notes_processed + 1;

        -- Create initial version (version 1) for this note
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
            v_note.id,
            -- Use the note's created_at as the start time, with no end (current version)
            tstzrange(v_note.created_at, NULL, '[)'),
            v_note.title,
            v_note.content,
            v_note.tags,
            v_note.is_archived,
            v_note.folder,
            v_note.user_id,  -- Use user_id as modified_by for initial version
            1,  -- Version 1 (initial)
            'Initial version (backfilled from import)',
            COALESCE(v_note.source, 'import'),  -- Use note's source or default to 'import'
            v_note.created_at
        );

        v_versions_created := v_versions_created + 1;
    END LOOP;

    RETURN QUERY SELECT v_notes_processed, v_versions_created;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill
DO $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Backfilling initial note versions...';
    RAISE NOTICE '============================================';

    SELECT * INTO v_result FROM backfill_initial_note_versions();

    RAISE NOTICE '';
    RAISE NOTICE 'Backfill complete!';
    RAISE NOTICE '  Notes processed: %', v_result.notes_processed;
    RAISE NOTICE '  Versions created: %', v_result.versions_created;
    RAISE NOTICE '';

    IF v_result.versions_created > 0 THEN
        RAISE NOTICE 'All notes now have version 1 (initial version) that can be restored to.';
    ELSE
        RAISE NOTICE 'No notes needed version history backfill.';
    END IF;

    RAISE NOTICE '============================================';
END $$;

-- Verify the backfill worked - show notes with their version counts
DO $$
DECLARE
    v_notes_without_versions INT;
BEGIN
    SELECT COUNT(*)
    INTO v_notes_without_versions
    FROM notes n
    LEFT JOIN note_versions nv ON n.id = nv.note_id
    WHERE nv.id IS NULL
      AND n.is_deleted = FALSE;

    IF v_notes_without_versions > 0 THEN
        RAISE WARNING 'There are still % notes without version history!', v_notes_without_versions;
    ELSE
        RAISE NOTICE 'Verification passed: All non-deleted notes have version history.';
    END IF;
END $$;

-- ============================================================================
-- Complete
-- ============================================================================
