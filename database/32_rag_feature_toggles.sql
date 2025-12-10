-- Migration: Add RAG Feature Toggles to user_preferences
-- These boolean flags allow users to enable/disable individual RAG pipeline features

-- Add RAG feature toggle columns to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_hyde BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_query_expansion BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_hybrid_search BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_reranking BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_analytics BOOLEAN NOT NULL DEFAULT TRUE;

-- Description of each toggle:
-- rag_enable_hyde: Enable Hypothetical Document Embeddings for better semantic search
-- rag_enable_query_expansion: Enable multi-query generation for improved recall
-- rag_enable_hybrid_search: Enable combined vector + BM25 search
-- rag_enable_reranking: Enable LLM-based relevance scoring
-- rag_enable_analytics: Enable logging of RAG query metrics
