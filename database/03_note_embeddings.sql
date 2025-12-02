-- ============================================================================
-- Second Brain Database - Note Embeddings Table
-- ============================================================================
-- Table: note_embeddings
-- Stores vector embeddings for semantic search (RAG)
-- Uses pgvector extension for vector(1536) type
-- ============================================================================

-- Note embeddings table - stores vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS note_embeddings (
    id TEXT PRIMARY KEY,
    note_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    embedding_provider VARCHAR(50) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    note_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    note_title VARCHAR(500) NOT NULL,
    note_tags TEXT[] NOT NULL DEFAULT '{}'
);

-- Add comments for documentation
COMMENT ON TABLE note_embeddings IS 'Vector embeddings for note chunks used in RAG';
COMMENT ON COLUMN note_embeddings.id IS 'Unique embedding identifier';
COMMENT ON COLUMN note_embeddings.note_id IS 'Reference to the parent note';
COMMENT ON COLUMN note_embeddings.user_id IS 'Owner user ID for filtering';
COMMENT ON COLUMN note_embeddings.chunk_index IS 'Index of the chunk within the note';
COMMENT ON COLUMN note_embeddings.content IS 'Text content of the chunk';
COMMENT ON COLUMN note_embeddings.embedding IS '1536-dimension vector embedding';
COMMENT ON COLUMN note_embeddings.embedding_provider IS 'Provider used to generate embedding (e.g., openai)';
COMMENT ON COLUMN note_embeddings.embedding_model IS 'Model used to generate embedding (e.g., text-embedding-ada-002)';
COMMENT ON COLUMN note_embeddings.note_updated_at IS 'Timestamp when the source note was last modified (for incremental indexing)';
COMMENT ON COLUMN note_embeddings.note_title IS 'Denormalized note title for display';
COMMENT ON COLUMN note_embeddings.note_tags IS 'Denormalized note tags for filtering';

