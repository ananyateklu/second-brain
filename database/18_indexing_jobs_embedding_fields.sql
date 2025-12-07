-- ============================================================================
-- Second Brain Database - Indexing Jobs Embedding Fields
-- ============================================================================
-- Migration: 18_indexing_jobs_embedding_fields.sql
-- Purpose: Add embedding_provider and embedding_model columns to indexing_jobs
--          These columns track which embedding provider and model were used
--          for generating embeddings during an indexing job.
-- ============================================================================

-- Add embedding_provider column (if missing)
-- This column may already exist in some databases from the original schema
ALTER TABLE indexing_jobs 
  ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50) NOT NULL DEFAULT '';

-- Add embedding_model column (new column)
ALTER TABLE indexing_jobs 
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) NOT NULL DEFAULT '';

-- Add comments for documentation
COMMENT ON COLUMN indexing_jobs.embedding_provider IS 'Embedding provider used (e.g., OpenAI, Gemini, Ollama)';
COMMENT ON COLUMN indexing_jobs.embedding_model IS 'Specific embedding model used (e.g., text-embedding-3-small, text-embedding-004)';

-- ============================================================================
-- Rollback script (if needed):
-- ============================================================================
-- ALTER TABLE indexing_jobs DROP COLUMN IF EXISTS embedding_model;
-- -- Note: Keep embedding_provider as it was in the original schema
-- ============================================================================
