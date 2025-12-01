-- Migration: Add full-text search vector for hybrid search (BM25 + Vector)
-- This enables combining semantic vector search with keyword-based BM25 search
-- for improved retrieval accuracy using Reciprocal Rank Fusion (RRF)

-- Add tsvector column for full-text search
ALTER TABLE note_embeddings 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
-- GIN indexes are optimized for tsvector and support fast lookups
CREATE INDEX IF NOT EXISTS idx_note_embeddings_search_vector 
ON note_embeddings USING GIN(search_vector);

-- Function to automatically update the search vector when content changes
-- Uses English language configuration for stemming and stop word removal
CREATE OR REPLACE FUNCTION update_note_embedding_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Combine note title and content for full-text search
    -- Weight title higher (A) than content (B) for better relevance
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.note_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS trg_note_embedding_search_vector ON note_embeddings;
CREATE TRIGGER trg_note_embedding_search_vector
    BEFORE INSERT OR UPDATE OF note_title, content ON note_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_note_embedding_search_vector();

-- Populate search_vector for existing records
UPDATE note_embeddings
SET search_vector = 
    setweight(to_tsvector('english', COALESCE(note_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B')
WHERE search_vector IS NULL;

-- Create table for RAG query analytics/observability
-- Tracks retrieval metrics to correlate with user feedback
CREATE TABLE IF NOT EXISTS rag_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    query TEXT NOT NULL,
    
    -- Timing metrics
    query_embedding_time_ms INT,
    vector_search_time_ms INT,
    bm25_search_time_ms INT,
    rerank_time_ms INT,
    total_time_ms INT,
    
    -- Result metrics
    retrieved_count INT,
    final_count INT,
    
    -- Score metrics for correlation analysis
    avg_cosine_score FLOAT,
    avg_bm25_score FLOAT,
    avg_rerank_score FLOAT,
    top_cosine_score FLOAT,
    top_rerank_score FLOAT,
    
    -- Feature flags for this query
    hybrid_search_enabled BOOLEAN DEFAULT true,
    hyde_enabled BOOLEAN DEFAULT false,
    multi_query_enabled BOOLEAN DEFAULT false,
    reranking_enabled BOOLEAN DEFAULT false,
    
    -- User feedback (critical for improvement analysis)
    user_feedback VARCHAR(20), -- 'thumbs_up', 'thumbs_down', null
    feedback_category VARCHAR(50), -- 'wrong_info', 'missing_context', 'irrelevant', etc.
    feedback_comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user_id ON rag_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_created_at ON rag_query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user_feedback ON rag_query_logs(user_feedback) WHERE user_feedback IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_conversation ON rag_query_logs(conversation_id);

-- Add comment explaining the hybrid search approach
COMMENT ON COLUMN note_embeddings.search_vector IS 
'Full-text search vector for BM25 keyword search. Combined with vector similarity via Reciprocal Rank Fusion (RRF) for hybrid search.';

COMMENT ON TABLE rag_query_logs IS 
'Analytics table for RAG retrieval observability. Tracks search metrics to enable data-driven optimization based on user feedback correlation.';

