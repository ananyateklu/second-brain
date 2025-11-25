-- ============================================================================
-- Second Brain Database Extensions
-- ============================================================================
-- This script enables required PostgreSQL extensions
-- Must be run by a superuser or a user with CREATE privileges
-- ============================================================================

-- Enable pgvector extension for vector similarity search
-- Used for storing and querying note embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension failed to install';
    END IF;
END $$;

