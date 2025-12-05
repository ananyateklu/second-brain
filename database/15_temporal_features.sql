-- ============================================================================
-- Second Brain Database - PostgreSQL 18 Temporal Features
-- ============================================================================
-- This script implements temporal tables using PostgreSQL 18's 
-- WITHOUT OVERLAPS constraint for:
--   1. Note version history - Track all changes to notes over time
--   2. Chat session tracking - Monitor user engagement with conversations
-- ============================================================================

-- Check PostgreSQL version (requires 18+)
DO $$
BEGIN
    IF current_setting('server_version_num')::int < 180000 THEN
        RAISE EXCEPTION 'PostgreSQL 18 or higher required for temporal features. Current version: %', 
            current_setting('server_version');
    END IF;
    RAISE NOTICE 'PostgreSQL 18 detected, proceeding with temporal features...';
END $$;

-- Enable btree_gist extension (required for WITHOUT OVERLAPS with non-range columns)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1. Note Versions Table - Temporal History of Notes
-- ============================================================================
-- Tracks every version of a note with non-overlapping validity periods.
-- The WITHOUT OVERLAPS constraint ensures no two versions of the same note
-- have overlapping time periods.

CREATE TABLE IF NOT EXISTS note_versions (
    -- Primary key for EF Core tracking
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Composite temporal key (enforced via exclusion constraint)
    note_id TEXT NOT NULL,
    valid_period TSTZRANGE NOT NULL,
    
    -- Version content (snapshot of note at this time)
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    folder VARCHAR(256),
    
    -- Audit information
    modified_by VARCHAR(128) NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_summary VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Temporal exclusion constraint: no overlapping versions for same note
    CONSTRAINT uq_note_versions_temporal 
        EXCLUDE USING GIST (note_id WITH =, valid_period WITH &&),
    
    -- Foreign key to notes table
    CONSTRAINT fk_note_versions_notes
        FOREIGN KEY (note_id)
        REFERENCES notes(id)
        ON DELETE CASCADE
);

-- Indexes for efficient temporal queries
CREATE INDEX IF NOT EXISTS ix_note_versions_note_id 
ON note_versions(note_id);

CREATE INDEX IF NOT EXISTS ix_note_versions_modified_by 
ON note_versions(modified_by);

CREATE INDEX IF NOT EXISTS ix_note_versions_created_at 
ON note_versions(created_at DESC);

-- GiST index for range queries (contains, overlaps, etc.)
CREATE INDEX IF NOT EXISTS ix_note_versions_valid_period 
ON note_versions USING GIST(valid_period);

-- ============================================================================
-- 2. Chat Sessions Table - Temporal Session Tracking
-- ============================================================================
-- Tracks user activity sessions with conversations.
-- The WITHOUT OVERLAPS constraint ensures a user can only have one
-- active session per conversation at any given time.

CREATE TABLE IF NOT EXISTS chat_sessions (
    -- Session identification
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(128) NOT NULL,
    conversation_id TEXT NOT NULL,
    
    -- Temporal period
    session_period TSTZRANGE NOT NULL,
    
    -- Session metadata
    device_info JSONB,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    
    -- Activity metrics
    messages_sent INT NOT NULL DEFAULT 0,
    messages_received INT NOT NULL DEFAULT 0,
    tokens_used INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Temporal constraint: no overlapping sessions for same user+conversation
    CONSTRAINT uq_chat_sessions_temporal 
        UNIQUE (user_id, conversation_id, session_period WITHOUT OVERLAPS),
    
    -- Foreign key to conversations table
    CONSTRAINT fk_chat_sessions_conversations
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversations(id)
        ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id 
ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS ix_chat_sessions_conversation_id 
ON chat_sessions(conversation_id);

CREATE INDEX IF NOT EXISTS ix_chat_sessions_created_at 
ON chat_sessions(created_at DESC);

-- GiST index for temporal range queries
CREATE INDEX IF NOT EXISTS ix_chat_sessions_period 
ON chat_sessions USING GIST(session_period);

-- Composite index for user session lookups
CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_conversation 
ON chat_sessions(user_id, conversation_id);

-- ============================================================================
-- 3. Helper Functions for Temporal Queries
-- ============================================================================

-- Function to get the current version of a note
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
    version_number INT
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
        nv.version_number
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
      AND nv.valid_period @> NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get note version at a specific point in time
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
    version_number INT
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
        nv.version_number
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
      AND nv.valid_period @> p_timestamp;
END;
$$ LANGUAGE plpgsql;

-- Function to get full version history of a note
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
        upper_inf(nv.valid_period) AS is_current
    FROM note_versions nv
    WHERE nv.note_id = p_note_id
    ORDER BY lower(nv.valid_period) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new note version (closes current and opens new)
CREATE OR REPLACE FUNCTION create_note_version(
    p_note_id TEXT,
    p_title VARCHAR(500),
    p_content TEXT,
    p_tags TEXT[],
    p_is_archived BOOLEAN,
    p_folder VARCHAR(256),
    p_modified_by VARCHAR(128),
    p_change_summary VARCHAR(500) DEFAULT NULL
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
        v_now
    );
    
    RETURN v_new_version_number;
END;
$$ LANGUAGE plpgsql;

-- Function to start a chat session
CREATE OR REPLACE FUNCTION start_chat_session(
    p_user_id VARCHAR(128),
    p_conversation_id TEXT,
    p_device_info JSONB DEFAULT NULL,
    p_user_agent VARCHAR(500) DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_session_id TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- End any existing open session for this user+conversation
    UPDATE chat_sessions
    SET session_period = tstzrange(lower(session_period), v_now, '[)')
    WHERE user_id = p_user_id
      AND conversation_id = p_conversation_id
      AND upper_inf(session_period);
    
    -- Create new session
    INSERT INTO chat_sessions (
        id,
        user_id,
        conversation_id,
        session_period,
        device_info,
        user_agent,
        ip_address,
        created_at
    ) VALUES (
        gen_random_uuid()::text,
        p_user_id,
        p_conversation_id,
        tstzrange(v_now, NULL, '[)'),
        p_device_info,
        p_user_agent,
        p_ip_address,
        v_now
    )
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end a chat session
CREATE OR REPLACE FUNCTION end_chat_session(
    p_session_id TEXT,
    p_messages_sent INT DEFAULT NULL,
    p_messages_received INT DEFAULT NULL,
    p_tokens_used INT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    UPDATE chat_sessions
    SET 
        session_period = tstzrange(lower(session_period), v_now, '[)'),
        messages_sent = COALESCE(p_messages_sent, messages_sent),
        messages_received = COALESCE(p_messages_received, messages_received),
        tokens_used = COALESCE(p_tokens_used, tokens_used)
    WHERE id = p_session_id
      AND upper_inf(session_period);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get session statistics for a user
CREATE OR REPLACE FUNCTION get_user_session_stats(
    p_user_id VARCHAR(128),
    p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_sessions BIGINT,
    total_messages_sent BIGINT,
    total_messages_received BIGINT,
    total_tokens_used BIGINT,
    avg_session_duration_minutes NUMERIC,
    unique_conversations BIGINT,
    first_session_at TIMESTAMP WITH TIME ZONE,
    last_session_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_sessions,
        SUM(cs.messages_sent)::BIGINT AS total_messages_sent,
        SUM(cs.messages_received)::BIGINT AS total_messages_received,
        SUM(cs.tokens_used)::BIGINT AS total_tokens_used,
        ROUND(AVG(
            EXTRACT(EPOCH FROM (
                COALESCE(upper(cs.session_period), NOW()) - lower(cs.session_period)
            )) / 60
        )::NUMERIC, 2) AS avg_session_duration_minutes,
        COUNT(DISTINCT cs.conversation_id)::BIGINT AS unique_conversations,
        MIN(lower(cs.session_period)) AS first_session_at,
        MAX(lower(cs.session_period)) AS last_session_at
    FROM chat_sessions cs
    WHERE cs.user_id = p_user_id
      AND (p_since IS NULL OR lower(cs.session_period) >= p_since);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Trigger to Auto-Version Notes on Update (Optional)
-- ============================================================================
-- This trigger automatically creates a version when a note is updated.
-- It's commented out by default - enable if you want automatic versioning.

/*
CREATE OR REPLACE FUNCTION trigger_create_note_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if content actually changed
    IF OLD.title != NEW.title OR OLD.content != NEW.content 
       OR OLD.tags != NEW.tags OR OLD.is_archived != NEW.is_archived 
       OR OLD.folder IS DISTINCT FROM NEW.folder THEN
        
        PERFORM create_note_version(
            NEW.id,
            NEW.title,
            NEW.content,
            NEW.tags,
            NEW.is_archived,
            NEW.folder,
            COALESCE(NEW.user_id, 'system'),
            'Auto-versioned on update'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notes_auto_version
    AFTER UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_note_version();
*/

-- ============================================================================
-- 5. Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE note_versions IS 'Temporal history of note versions using PostgreSQL 18 WITHOUT OVERLAPS constraint';
COMMENT ON COLUMN note_versions.valid_period IS 'Time range during which this version was/is valid. Uses tstzrange with [) bounds.';
COMMENT ON COLUMN note_versions.version_number IS 'Sequential version number for this note';
COMMENT ON COLUMN note_versions.change_summary IS 'Optional description of what changed in this version';

COMMENT ON TABLE chat_sessions IS 'Temporal tracking of user chat sessions with PostgreSQL 18 WITHOUT OVERLAPS constraint';
COMMENT ON COLUMN chat_sessions.session_period IS 'Time range of the session. Open sessions have unbounded upper limit.';
COMMENT ON COLUMN chat_sessions.device_info IS 'JSONB containing device/client information';

COMMENT ON FUNCTION get_current_note_version IS 'Returns the current (active) version of a note';
COMMENT ON FUNCTION get_note_version_at_time IS 'Returns the version of a note that was active at a specific timestamp';
COMMENT ON FUNCTION get_note_version_history IS 'Returns all versions of a note ordered by time descending';
COMMENT ON FUNCTION create_note_version IS 'Creates a new version of a note, closing any current version';
COMMENT ON FUNCTION start_chat_session IS 'Starts a new chat session, closing any existing open session';
COMMENT ON FUNCTION end_chat_session IS 'Ends an open chat session with optional metrics';
COMMENT ON FUNCTION get_user_session_stats IS 'Returns aggregate session statistics for a user';

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Temporal features migration complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - note_versions (with WITHOUT OVERLAPS PK)';
    RAISE NOTICE '  - chat_sessions (with WITHOUT OVERLAPS constraint)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '  - get_current_note_version()';
    RAISE NOTICE '  - get_note_version_at_time()';
    RAISE NOTICE '  - get_note_version_history()';
    RAISE NOTICE '  - create_note_version()';
    RAISE NOTICE '  - start_chat_session()';
    RAISE NOTICE '  - end_chat_session()';
    RAISE NOTICE '  - get_user_session_stats()';
    RAISE NOTICE '';
    RAISE NOTICE 'To enable automatic note versioning, uncomment the trigger in this script.';
    RAISE NOTICE '============================================';
END $$;
