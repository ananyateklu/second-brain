-- Add RAG Advanced Settings to user_preferences
-- These settings allow users to fine-tune RAG pipeline behavior

-- Tier 1: Core Retrieval Settings
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_top_k INTEGER DEFAULT 5;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_similarity_threshold REAL DEFAULT 0.3;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_initial_retrieval_count INTEGER DEFAULT 20;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_min_rerank_score REAL DEFAULT 3.0;

-- Tier 2: Hybrid Search Settings
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_vector_weight REAL DEFAULT 0.7;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_bm25_weight REAL DEFAULT 0.3;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_multi_query_count INTEGER DEFAULT 3;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS rag_max_context_length INTEGER DEFAULT 4000;

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.rag_top_k IS 'Number of results to return after all processing (1-20)';
COMMENT ON COLUMN user_preferences.rag_similarity_threshold IS 'Minimum vector similarity threshold (0.1-0.9)';
COMMENT ON COLUMN user_preferences.rag_initial_retrieval_count IS 'Number of candidates to retrieve before reranking (10-50)';
COMMENT ON COLUMN user_preferences.rag_min_rerank_score IS 'Minimum rerank score (0-10) to include a result';
COMMENT ON COLUMN user_preferences.rag_vector_weight IS 'Weight for vector (semantic) search in hybrid search (0-1)';
COMMENT ON COLUMN user_preferences.rag_bm25_weight IS 'Weight for BM25 (keyword) search in hybrid search (0-1)';
COMMENT ON COLUMN user_preferences.rag_multi_query_count IS 'Number of query variations to generate (1-5)';
COMMENT ON COLUMN user_preferences.rag_max_context_length IS 'Maximum context length in chars for LLM (1000-16000)';
