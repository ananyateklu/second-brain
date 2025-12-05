-- ============================================================================
-- Second Brain Database Extensions
-- ============================================================================
-- This script enables required PostgreSQL extensions
-- Must be run by a superuser or a user with CREATE privileges
-- ============================================================================

-- Enable pgvector extension for vector similarity search
-- Used for storing and querying note embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_stat_statements for query performance monitoring (PostgreSQL 18)
-- Tracks execution statistics of all SQL statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable uuid-ossp for UUID generation (used by UUIDv7 in PostgreSQL 18)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable btree_gist for temporal constraints (WITHOUT OVERLAPS) in PostgreSQL 18
-- Required for composite primary keys with range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Verify extensions are installed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension failed to install';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE NOTICE 'pg_stat_statements extension not installed - monitoring will be limited';
    END IF;
END $$;

