-- Migration: Add HNSW vector index to focus_suggestions for efficient similarity search
-- This enables fast vector similarity queries for AI-generated focus suggestions
-- Uses partial index to exclude soft-deleted records, reducing index size

-- Create HNSW index for focus_suggestions embeddings
-- Parameters: m=16 (connections per layer), ef_construction=64 (build quality)
-- These are balanced settings for moderate-sized tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_focus_suggestions_embedding_hnsw
ON focus_suggestions USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE is_deleted = false;

-- Create dimension-specific HNSW index for 1536-dim embeddings (OpenAI default)
-- Higher parameters (m=24, ef_construction=128) for better recall on primary dimension
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_focus_suggestions_embedding_hnsw_1536
ON focus_suggestions USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128)
WHERE embedding_dimensions = 1536 AND is_deleted = false;

-- Create covering index for common query pattern: get suggestions by user with scores
-- This enables index-only scans for listing suggestions without touching the heap
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_focus_suggestions_user_listing
ON focus_suggestions (user_id, confidence DESC, created_at DESC)
INCLUDE (title, status, source_note_id, accepted_focus_item_id)
WHERE is_deleted = false;

-- Add comment documenting the indexes
COMMENT ON INDEX ix_focus_suggestions_embedding_hnsw IS
    'HNSW index for vector similarity search on focus suggestions. Uses cosine distance.';
COMMENT ON INDEX ix_focus_suggestions_embedding_hnsw_1536 IS
    'Optimized HNSW index for 1536-dimension embeddings (OpenAI). Higher recall parameters.';
COMMENT ON INDEX ix_focus_suggestions_user_listing IS
    'Covering index for listing suggestions by user with common columns included.';
