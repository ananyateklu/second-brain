-- Migration: Add markdown_renderer column to chat_messages
-- Tracks which markdown renderer was used when displaying each message
-- This allows historical tracking of renderer preference per message

-- Add markdown_renderer column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS
    markdown_renderer VARCHAR(20) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.markdown_renderer IS
    'Markdown renderer used to display this message: custom (react-markdown) or llm-ui. NULL for messages before this feature.';

-- Create index for potential filtering/analytics on renderer usage
CREATE INDEX IF NOT EXISTS idx_chat_messages_markdown_renderer
    ON chat_messages(markdown_renderer)
    WHERE markdown_renderer IS NOT NULL;
