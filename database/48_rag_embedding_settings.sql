-- Migration: Add RAG embedding provider settings to user_preferences
-- These settings allow users to persist their preferred embedding provider, model, and dimensions

-- Add rag_embedding_provider column
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_embedding_provider VARCHAR(50);

-- Add rag_embedding_model column
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_embedding_model VARCHAR(100);

-- Add rag_embedding_dimensions column (for models that support custom dimensions like Cohere)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_embedding_dimensions INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.rag_embedding_provider IS 'Preferred embedding provider (OpenAI, Cohere, Gemini, Ollama)';
COMMENT ON COLUMN user_preferences.rag_embedding_model IS 'Preferred embedding model for the selected provider';
COMMENT ON COLUMN user_preferences.rag_embedding_dimensions IS 'Custom output dimensions for models that support it (e.g., Cohere embed-v4.0)';
