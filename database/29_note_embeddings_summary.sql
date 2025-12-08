-- ============================================================================
-- Second Brain Database - Note Embeddings Summary Column
-- ============================================================================
-- Migration: 29_note_embeddings_summary.sql
-- Purpose: Add AI-generated note summary to embeddings for improved RAG context
-- ============================================================================

-- Add note_summary column to note_embeddings table
-- This stores the AI-generated summary with each embedding chunk
-- Improves RAG retrieval by providing semantic understanding of the note
ALTER TABLE note_embeddings ADD COLUMN IF NOT EXISTS note_summary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN note_embeddings.note_summary IS 'AI-generated summary of the source note for improved RAG context';

-- ============================================================================
-- Rollback script (if needed):
-- ============================================================================
-- ALTER TABLE note_embeddings DROP COLUMN IF EXISTS note_summary;
-- ============================================================================
