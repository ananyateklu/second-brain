-- ============================================================================
-- Second Brain Database - Variable Embedding Dimensions Support
-- ============================================================================
-- Migration: 17_variable_embedding_dimensions.sql
-- Purpose: Support variable-dimension embeddings for different providers
--          - OpenAI: 1536 dimensions
--          - Gemini: 1536 dimensions (configurable: 768, 1536, 3072)
--          - Ollama nomic-embed-text: 768 dimensions
--          - Ollama mxbai-embed-large: 1024 dimensions
-- ============================================================================

-- Step 1: Add dimension tracking column (before altering vector column)
ALTER TABLE note_embeddings 
  ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER;

-- Step 2: Update existing rows to mark them as 1536 dimensions
UPDATE note_embeddings 
SET embedding_dimensions = 1536 
WHERE embedding_dimensions IS NULL;

-- Step 3: Alter embedding column to support variable dimensions
-- Note: This removes the fixed (1536) constraint, allowing any dimension
ALTER TABLE note_embeddings 
  ALTER COLUMN embedding TYPE vector;

-- Step 4: Add NOT NULL constraint to embedding_dimensions after backfill
ALTER TABLE note_embeddings 
  ALTER COLUMN embedding_dimensions SET NOT NULL;

-- Step 5: Set default for new rows (will be overwritten by application)
ALTER TABLE note_embeddings 
  ALTER COLUMN embedding_dimensions SET DEFAULT 1536;

-- Step 6: Add index on embedding_dimensions for filtering
CREATE INDEX IF NOT EXISTS idx_note_embeddings_dimensions 
ON note_embeddings(embedding_dimensions);

-- Step 7: Create composite index for dimension-aware searches
CREATE INDEX IF NOT EXISTS idx_note_embeddings_user_dimensions 
ON note_embeddings(user_id, embedding_dimensions);

-- Add comments for documentation
COMMENT ON COLUMN note_embeddings.embedding_dimensions IS 'Number of dimensions in the embedding vector (e.g., 768, 1024, 1536)';

-- ============================================================================
-- Rollback script (if needed):
-- ============================================================================
-- ALTER TABLE note_embeddings DROP COLUMN IF EXISTS embedding_dimensions;
-- ALTER TABLE note_embeddings ALTER COLUMN embedding TYPE vector(1536);
-- DROP INDEX IF EXISTS idx_note_embeddings_dimensions;
-- DROP INDEX IF EXISTS idx_note_embeddings_user_dimensions;
-- ============================================================================

