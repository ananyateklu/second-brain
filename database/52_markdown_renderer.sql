-- Migration: Add markdown_renderer column to user_preferences
-- This setting allows users to choose between 'custom' (react-markdown) and 'llm-ui' renderers

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
    markdown_renderer VARCHAR(20) DEFAULT 'custom';

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.markdown_renderer IS 'Markdown renderer preference: custom (react-markdown) or llm-ui';
