-- Add detailed token usage tracking columns to chat_messages table
-- This migration adds columns for accurate, provider-reported token tracking

-- Add new token tracking columns to chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS tokens_actual BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cache_creation_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rag_context_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rag_chunks_count INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tool_definition_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tool_argument_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tool_result_tokens INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN chat_messages.tokens_actual IS 'Whether token counts are actual provider values (true) or estimates (false)';
COMMENT ON COLUMN chat_messages.reasoning_tokens IS 'Tokens used for reasoning/thinking (Claude extended thinking, Gemini thinking mode)';
COMMENT ON COLUMN chat_messages.cache_creation_tokens IS 'Tokens used to create prompt cache (Claude prompt caching)';
COMMENT ON COLUMN chat_messages.cache_read_tokens IS 'Tokens read from prompt cache (Claude prompt caching)';
COMMENT ON COLUMN chat_messages.rag_context_tokens IS 'Tokens used by RAG context';
COMMENT ON COLUMN chat_messages.rag_chunks_count IS 'Number of RAG chunks included in context';
COMMENT ON COLUMN chat_messages.tool_definition_tokens IS 'Tokens used for tool definitions (agent mode)';
COMMENT ON COLUMN chat_messages.tool_argument_tokens IS 'Tokens used for tool arguments (agent mode)';
COMMENT ON COLUMN chat_messages.tool_result_tokens IS 'Tokens used for tool results (agent mode)';

-- Create index on tokens_actual for filtering actual vs estimated token usage
CREATE INDEX IF NOT EXISTS idx_chat_messages_tokens_actual
ON chat_messages(tokens_actual)
WHERE tokens_actual IS NOT NULL;

-- Create composite index for token analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_token_analytics
ON chat_messages(conversation_id, timestamp, input_tokens, output_tokens)
WHERE input_tokens IS NOT NULL OR output_tokens IS NOT NULL;
