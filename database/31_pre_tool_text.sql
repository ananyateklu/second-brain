-- ============================================================================
-- Second Brain Database - Pre-Tool Text for Interleaved Timeline
-- ============================================================================
-- Migration: 31_pre_tool_text.sql
-- Purpose: Add pre_tool_text column to tool_calls table to persist text
--          content that was streamed before each tool execution, enabling
--          chronological reconstruction of agent responses in the UI.
-- ============================================================================

-- Add pre_tool_text column to store text that appeared before each tool call
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS pre_tool_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tool_calls.pre_tool_text IS 'Text content streamed before this tool was invoked. Used to reconstruct chronological order of text and tool calls in the UI.';

-- ============================================================================
-- Rollback script (if needed):
-- ALTER TABLE tool_calls DROP COLUMN IF EXISTS pre_tool_text;
-- ============================================================================





