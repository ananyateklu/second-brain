-- ============================================================================
-- Migration: 26_reranking_provider.sql
-- Description: Add reranking_provider column to user_preferences table
-- ============================================================================

-- Add reranking_provider column to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS reranking_provider VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.reranking_provider IS 'Preferred AI provider for RAG reranking (e.g., OpenAI, Anthropic, Gemini, Grok)';

-- ============================================================================
-- End of migration
-- ============================================================================
