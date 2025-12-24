-- Migration: Add Query Expansion Provider Settings to user_preferences
-- These settings allow users to configure which AI provider/model to use
-- for Query Expansion (multi-query generation) in the RAG pipeline.

-- Add Query Expansion provider column
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_query_expansion_provider VARCHAR(50);

-- Add Query Expansion model column
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_query_expansion_model VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.rag_query_expansion_provider IS 'AI provider for query expansion/multi-query generation (OpenAI, Anthropic, Gemini, Grok, Ollama). Default: uses system config.';
COMMENT ON COLUMN user_preferences.rag_query_expansion_model IS 'Optional model override for query expansion. If null, uses provider default model.';
