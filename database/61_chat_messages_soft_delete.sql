-- Migration: Add soft delete columns to chat_messages and tool_calls
-- This enables message-level deletion without removing conversation history
-- Uses same pattern as notes and conversations for consistency

-- ============================================================================
-- 1. Add soft delete columns to chat_messages
-- ============================================================================

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(128);

-- Create partial index for non-deleted messages (most common query)
-- Uses BRIN for timestamp ordering with partial index for soft delete
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_chat_messages_conversation_active
ON chat_messages (conversation_id, timestamp DESC)
WHERE is_deleted = false;

-- Index for finding deleted messages (for restore operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_chat_messages_deleted
ON chat_messages (deleted_at DESC)
WHERE is_deleted = true;

-- Add comments for documentation
COMMENT ON COLUMN chat_messages.is_deleted IS 'Soft delete flag - when true, message is considered deleted';
COMMENT ON COLUMN chat_messages.deleted_at IS 'Timestamp when the message was soft deleted';
COMMENT ON COLUMN chat_messages.deleted_by IS 'User ID who deleted the message';

-- ============================================================================
-- 2. Add soft delete columns to tool_calls
-- ============================================================================

ALTER TABLE tool_calls
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(128);

-- Create partial index for non-deleted tool calls
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_message_active
ON tool_calls (message_id, executed_at DESC)
WHERE is_deleted = false;

-- Index for finding deleted tool calls (for audit trail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_deleted
ON tool_calls (deleted_at DESC)
WHERE is_deleted = true;

-- Add comments for documentation
COMMENT ON COLUMN tool_calls.is_deleted IS 'Soft delete flag - when true, tool call is considered deleted';
COMMENT ON COLUMN tool_calls.deleted_at IS 'Timestamp when the tool call was soft deleted';
COMMENT ON COLUMN tool_calls.deleted_by IS 'User ID who deleted the tool call';

-- ============================================================================
-- 3. Update existing indexes to be partial (if not already)
-- ============================================================================

-- Drop old full-table index if it exists and recreate as partial
DROP INDEX CONCURRENTLY IF EXISTS ix_chat_messages_conversation;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_chat_messages_conversation
ON chat_messages (conversation_id, timestamp DESC)
WHERE is_deleted = false;

-- Optimize tool_calls index
DROP INDEX CONCURRENTLY IF EXISTS ix_tool_calls_message;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tool_calls_message
ON tool_calls (message_id, executed_at DESC)
WHERE is_deleted = false;

-- ============================================================================
-- 4. Create helper function for cascading soft deletes
-- ============================================================================

-- Function to soft delete messages when conversation is soft deleted
CREATE OR REPLACE FUNCTION cascade_conversation_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        -- Soft delete all messages in this conversation
        UPDATE chat_messages
        SET is_deleted = TRUE,
            deleted_at = NEW.deleted_at,
            deleted_by = NEW.deleted_by
        WHERE conversation_id = NEW.id
          AND is_deleted = FALSE;

        -- Soft delete all tool calls for messages in this conversation
        UPDATE tool_calls
        SET is_deleted = TRUE,
            deleted_at = NEW.deleted_at,
            deleted_by = NEW.deleted_by
        WHERE message_id IN (
            SELECT id FROM chat_messages WHERE conversation_id = NEW.id
        )
        AND is_deleted = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cascading soft deletes (optional - can be managed in app layer)
-- Uncomment if you want database-level cascade:
-- DROP TRIGGER IF EXISTS trg_cascade_conversation_soft_delete ON chat_conversations;
-- CREATE TRIGGER trg_cascade_conversation_soft_delete
--     AFTER UPDATE ON chat_conversations
--     FOR EACH ROW
--     WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
--     EXECUTE FUNCTION cascade_conversation_soft_delete();

COMMENT ON FUNCTION cascade_conversation_soft_delete() IS
    'Cascades soft delete from conversation to messages and tool calls. Trigger is optional.';
