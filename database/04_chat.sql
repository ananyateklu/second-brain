-- ============================================================================
-- Second Brain Database - Chat Tables
-- ============================================================================
-- Tables: chat_conversations, chat_messages, tool_calls, retrieved_notes
-- Relationships:
--   - chat_messages -> chat_conversations (cascade delete)
--   - tool_calls -> chat_messages (cascade delete)
--   - retrieved_notes -> chat_messages (cascade delete)
-- ============================================================================

-- Chat conversations table - stores AI chat sessions
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    rag_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    agent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    image_generation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    agent_capabilities TEXT,
    vector_store_provider VARCHAR(50),
    user_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Chat messages table - stores individual messages in conversations
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    input_tokens INTEGER,
    output_tokens INTEGER,
    duration_ms DOUBLE PRECISION,
    
    -- Foreign key constraint
    CONSTRAINT fk_chat_messages_conversations
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversations(id)
        ON DELETE CASCADE
);

-- Tool calls table - stores agent tool executions
CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    arguments TEXT NOT NULL,
    result TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Foreign key constraint
    CONSTRAINT fk_tool_calls_messages
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

-- Retrieved notes table - stores RAG context for messages
CREATE TABLE IF NOT EXISTS retrieved_notes (
    id TEXT PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    note_id VARCHAR(128) NOT NULL,
    title VARCHAR(500) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    relevance_score REAL NOT NULL,
    chunk_content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_retrieved_notes_messages
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE chat_conversations IS 'AI chat conversation sessions';
COMMENT ON COLUMN chat_conversations.provider IS 'AI provider (openai, anthropic, etc.)';
COMMENT ON COLUMN chat_conversations.model IS 'AI model used for the conversation';
COMMENT ON COLUMN chat_conversations.rag_enabled IS 'Whether RAG is enabled for this conversation';
COMMENT ON COLUMN chat_conversations.agent_enabled IS 'Whether agent mode is enabled';
COMMENT ON COLUMN chat_conversations.image_generation_enabled IS 'Whether this conversation is for image generation';
COMMENT ON COLUMN chat_conversations.agent_capabilities IS 'JSON array of enabled agent capability IDs (e.g., ["notes"])';
COMMENT ON COLUMN chat_conversations.vector_store_provider IS 'Vector store used for RAG';

COMMENT ON TABLE chat_messages IS 'Individual messages within conversations';
COMMENT ON COLUMN chat_messages.role IS 'Message role (user or assistant)';
COMMENT ON COLUMN chat_messages.input_tokens IS 'Token count for input/prompt';
COMMENT ON COLUMN chat_messages.output_tokens IS 'Token count for output/response';
COMMENT ON COLUMN chat_messages.duration_ms IS 'Response generation time in milliseconds';

COMMENT ON TABLE tool_calls IS 'Agent tool call executions';
COMMENT ON COLUMN tool_calls.tool_name IS 'Name of the tool that was called';
COMMENT ON COLUMN tool_calls.arguments IS 'JSON arguments passed to the tool';
COMMENT ON COLUMN tool_calls.result IS 'JSON result from the tool execution';
COMMENT ON COLUMN tool_calls.success IS 'Whether the tool execution succeeded';

COMMENT ON TABLE retrieved_notes IS 'Notes retrieved via RAG for context';
COMMENT ON COLUMN retrieved_notes.relevance_score IS 'Similarity score from vector search';
COMMENT ON COLUMN retrieved_notes.chunk_content IS 'Retrieved text chunk content';
COMMENT ON COLUMN retrieved_notes.chunk_index IS 'Index of the chunk within the source note';

