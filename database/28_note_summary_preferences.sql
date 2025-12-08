-- ============================================================================
-- Second Brain Database - Note Summary User Preferences
-- ============================================================================
-- Migration: 28_note_summary_preferences.sql
-- Purpose: Add note summary settings to user_preferences table
-- ============================================================================

-- Add note summary enabled column (default to true)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Add note summary provider column (default to OpenAI)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_provider VARCHAR(50) DEFAULT 'OpenAI';

-- Add note summary model column (default to gpt-4o-mini)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_model VARCHAR(100) DEFAULT 'gpt-4o-mini';

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.note_summary_enabled IS 'Whether AI note summaries are enabled for this user';
COMMENT ON COLUMN user_preferences.note_summary_provider IS 'AI provider to use for generating note summaries (e.g., OpenAI, Claude, Gemini)';
COMMENT ON COLUMN user_preferences.note_summary_model IS 'Specific model to use for generating note summaries (e.g., gpt-4o-mini)';

-- ============================================================================
-- Rollback script (if needed):
-- ALTER TABLE user_preferences DROP COLUMN IF EXISTS note_summary_enabled;
-- ALTER TABLE user_preferences DROP COLUMN IF EXISTS note_summary_provider;
-- ALTER TABLE user_preferences DROP COLUMN IF EXISTS note_summary_model;
-- ============================================================================
