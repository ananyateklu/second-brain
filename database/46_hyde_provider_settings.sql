-- Migration: Add HyDE Provider Settings to user_preferences
-- These settings allow users to configure which AI provider/model to use for HyDE
-- (Hypothetical Document Embeddings) generation in the RAG pipeline.

-- Add HyDE provider column - which AI provider to use for generating hypothetical documents
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_hyde_provider VARCHAR(50);

-- Add HyDE model column - optional model override (e.g., gpt-4o, claude-3-5-sonnet)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_hyde_model VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.rag_hyde_provider IS 'AI provider for HyDE document generation (OpenAI, Anthropic, Gemini, Grok, Ollama). Default: uses system config.';
COMMENT ON COLUMN user_preferences.rag_hyde_model IS 'Optional model override for HyDE generation. If null, uses provider default model.';
