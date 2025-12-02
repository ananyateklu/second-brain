-- ============================================================================
-- Add agent_rag_enabled column to chat_conversations table
-- ============================================================================
-- This column stores whether RAG context retrieval is enabled for agent mode
-- Defaults to TRUE (enabled) for new conversations

ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS agent_rag_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing conversations to have agent_rag_enabled = TRUE if agent_enabled = TRUE
-- This ensures existing agent conversations have RAG enabled by default
UPDATE chat_conversations
SET agent_rag_enabled = TRUE
WHERE agent_enabled = TRUE AND agent_rag_enabled IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_conversations.agent_rag_enabled IS 'Whether RAG context retrieval is enabled for agent mode in this conversation';

