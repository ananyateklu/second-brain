-- ============================================================================
-- Second Brain Database - PostgreSQL 18 Temporal Features Rollback
-- ============================================================================
-- Use this script to rollback temporal features if needed.
-- WARNING: This will delete all version history and session data!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back PostgreSQL 18 temporal features...';
    RAISE NOTICE 'WARNING: This will delete all version history and session data!';
END $$;

-- ============================================================================
-- 1. Drop Functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_session_stats(VARCHAR(128), TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS end_chat_session(TEXT, INT, INT, INT);
DROP FUNCTION IF EXISTS start_chat_session(VARCHAR(128), TEXT, JSONB, VARCHAR(500), VARCHAR(45));
DROP FUNCTION IF EXISTS create_note_version(TEXT, VARCHAR(500), TEXT, TEXT[], BOOLEAN, VARCHAR(256), VARCHAR(128), VARCHAR(500));
DROP FUNCTION IF EXISTS get_note_version_history(TEXT);
DROP FUNCTION IF EXISTS get_note_version_at_time(TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_current_note_version(TEXT);

-- Drop trigger function if exists
DROP FUNCTION IF EXISTS trigger_create_note_version();

-- ============================================================================
-- 2. Drop Indexes
-- ============================================================================

-- Note versions indexes
DROP INDEX IF EXISTS ix_note_versions_note_id;
DROP INDEX IF EXISTS ix_note_versions_modified_by;
DROP INDEX IF EXISTS ix_note_versions_created_at;
DROP INDEX IF EXISTS ix_note_versions_valid_period;

-- Chat sessions indexes
DROP INDEX IF EXISTS ix_chat_sessions_user_id;
DROP INDEX IF EXISTS ix_chat_sessions_conversation_id;
DROP INDEX IF EXISTS ix_chat_sessions_created_at;
DROP INDEX IF EXISTS ix_chat_sessions_period;
DROP INDEX IF EXISTS ix_chat_sessions_user_conversation;

-- ============================================================================
-- 3. Drop Tables
-- ============================================================================

DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS note_versions;

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Temporal features rollback complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropped tables:';
    RAISE NOTICE '  - note_versions';
    RAISE NOTICE '  - chat_sessions';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropped functions:';
    RAISE NOTICE '  - get_current_note_version()';
    RAISE NOTICE '  - get_note_version_at_time()';
    RAISE NOTICE '  - get_note_version_history()';
    RAISE NOTICE '  - create_note_version()';
    RAISE NOTICE '  - start_chat_session()';
    RAISE NOTICE '  - end_chat_session()';
    RAISE NOTICE '  - get_user_session_stats()';
    RAISE NOTICE '============================================';
END $$;
