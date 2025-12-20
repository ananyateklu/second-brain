-- ============================================================================
-- Second Brain Database - Users Tables
-- ============================================================================
-- Tables: users, user_preferences
-- Relationships: user_preferences has 1:1 FK to users (cascade delete)
-- ============================================================================

-- Users table - stores user account information
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email VARCHAR(256) NOT NULL,
    password_hash VARCHAR(256),
    display_name VARCHAR(256) NOT NULL,
    api_key VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- User preferences table - stores user settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    chat_provider VARCHAR(50),
    chat_model VARCHAR(100),
    vector_store_provider VARCHAR(50) NOT NULL DEFAULT 'PostgreSQL',
    default_note_view VARCHAR(20) NOT NULL DEFAULT 'list',
    items_per_page INTEGER NOT NULL DEFAULT 20,
    font_size VARCHAR(20) NOT NULL DEFAULT 'medium',
    enable_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    ollama_remote_url VARCHAR(256),
    use_remote_ollama BOOLEAN NOT NULL DEFAULT FALSE,
    smart_prompts_model VARCHAR(100),
    smart_prompts_provider VARCHAR(50),
    reranking_provider VARCHAR(50),
    
    -- Foreign key constraint
    CONSTRAINT fk_user_preferences_users
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts for the Second Brain application';
COMMENT ON COLUMN users.id IS 'Unique user identifier';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.password_hash IS 'Hashed password for authentication';
COMMENT ON COLUMN users.display_name IS 'User display name';
COMMENT ON COLUMN users.api_key IS 'API key for programmatic access';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';

COMMENT ON TABLE user_preferences IS 'User preferences and settings';
COMMENT ON COLUMN user_preferences.chat_provider IS 'Preferred AI chat provider (e.g., openai, anthropic)';
COMMENT ON COLUMN user_preferences.chat_model IS 'Preferred AI model for chat';
COMMENT ON COLUMN user_preferences.vector_store_provider IS 'Vector store provider for embeddings';
COMMENT ON COLUMN user_preferences.default_note_view IS 'Default view mode for notes (list/grid)';
COMMENT ON COLUMN user_preferences.ollama_remote_url IS 'URL for remote Ollama server';
COMMENT ON COLUMN user_preferences.use_remote_ollama IS 'Whether to use a remote Ollama server instead of local';
COMMENT ON COLUMN user_preferences.smart_prompts_model IS 'AI model used for smart prompt generation';
COMMENT ON COLUMN user_preferences.smart_prompts_provider IS 'AI provider used for smart prompt generation';
COMMENT ON COLUMN user_preferences.reranking_provider IS 'Preferred AI provider for RAG reranking (e.g., OpenAI, Anthropic, Gemini, Grok)';

