-- Focus AI User Settings
-- Adds columns for user-configurable Focus AI preferences

-- Add Focus AI settings columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS focus_ai_provider VARCHAR(50) DEFAULT 'OpenAI',
ADD COLUMN IF NOT EXISTS focus_ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS focus_ai_temperature REAL DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS focus_ai_max_tokens INTEGER DEFAULT 800,
ADD COLUMN IF NOT EXISTS focus_ai_rag_top_k INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS focus_ai_similarity_threshold REAL DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS focus_ai_max_suggestions INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS focus_ai_dedup_threshold REAL DEFAULT 0.85;

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.focus_ai_provider IS 'AI provider for Focus suggestions and summaries (OpenAI, Anthropic, Gemini, Ollama, xAI)';
COMMENT ON COLUMN user_preferences.focus_ai_model IS 'AI model for Focus suggestions and summaries';
COMMENT ON COLUMN user_preferences.focus_ai_temperature IS 'Temperature setting for Focus AI generation (0-1, higher = more creative)';
COMMENT ON COLUMN user_preferences.focus_ai_max_tokens IS 'Maximum tokens for Focus AI responses (100-4000)';
COMMENT ON COLUMN user_preferences.focus_ai_rag_top_k IS 'Number of notes to retrieve via RAG for Focus suggestions (1-20)';
COMMENT ON COLUMN user_preferences.focus_ai_similarity_threshold IS 'Minimum similarity score for RAG retrieval in Focus (0-1)';
COMMENT ON COLUMN user_preferences.focus_ai_max_suggestions IS 'Maximum number of Focus suggestions to return (1-10)';
COMMENT ON COLUMN user_preferences.focus_ai_dedup_threshold IS 'Similarity threshold for Focus suggestion deduplication (0-1)';
