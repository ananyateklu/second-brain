# Second Brain Database Schema

PostgreSQL database schema for the Second Brain application with pgvector support for semantic search.

## PostgreSQL 18 Features Guide

**New!** We have a comprehensive guide for leveraging PostgreSQL 18's cutting-edge features to maximize performance:

**[POSTGRESQL_18_FEATURES.md](./POSTGRESQL_18_FEATURES.md)** - Complete implementation guide covering:

| Feature | Benefit | Impact |
|---------|---------|--------|
| **UUIDv7** | Time-ordered primary keys | 4x faster index performance |
| **Async I/O** | Concurrent I/O operations | 2-3x faster scans |
| **pgvector 0.8** | Iterative index scans | Better filtered queries |
| **JSON_TABLE** | SQL/JSON standard | Cleaner JSON querying |
| **MERGE with RETURNING** | Atomic upserts | Single-operation updates |
| **Virtual Generated Columns** | Computed columns | Reduced trigger overhead |
| **Parallel GIN Builds** | Multi-threaded indexing | 50-70% faster builds |
| **Temporal Constraints** | Non-overlapping ranges | Audit trail support |

The guide includes step-by-step migration scripts, code examples, and a phased implementation roadmap.

---

## Prerequisites

- PostgreSQL 18 or higher (required for latest features)
- pgvector 0.8+ extension installed (`CREATE EXTENSION vector`)

### Installing pgvector

```bash
# On macOS with Homebrew (installs PostgreSQL 18 + pgvector)
brew install postgresql@18 pgvector

# On Ubuntu/Debian (adjust version as needed)
sudo apt install postgresql-18-pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make && sudo make install
```

## Quick Start

### Option 1: Use Migration Script (Recommended)

The `migrate.sh` script handles both Docker and Desktop PostgreSQL databases with migration tracking:

```bash
# Show migration status for both databases
./database/migrate.sh status

# Run pending migrations on both databases
./database/migrate.sh run

# Run on specific database only
./database/migrate.sh --docker run    # Docker (port 5432)
./database/migrate.sh --desktop run   # Desktop (port 5433)

# For Docker, set password via environment variable
POSTGRES_PASSWORD=yourpass ./database/migrate.sh status

# Initialize tracking for existing databases (without re-running migrations)
./database/migrate.sh init

# Run a specific migration script
./database/migrate.sh script 13

# Compare schemas between Docker and Desktop databases
POSTGRES_PASSWORD=yourpass ./database/migrate.sh diff

# Sync indexes between databases
./database/migrate.sh sync-to-docker    # Desktop → Docker
./database/migrate.sh sync-to-desktop   # Docker → Desktop

# Database maintenance
./database/migrate.sh backup            # Create backups
./database/migrate.sh stats             # Show statistics
./database/migrate.sh validate          # Verify schema
./database/migrate.sh export-schema     # Export schema SQL
./database/migrate.sh test              # Quick connection test

# Rollback a migration
./database/migrate.sh rollback 13       # Rollback migration 13
```

### Option 2: Run Master Script (Manual)

```bash
# From the database directory
cd database
psql -d secondbrain -f schema.sql
```

### Option 3: Run Individual Scripts (Manual)

```bash
psql -d secondbrain -f 00_extensions.sql
psql -d secondbrain -f 01_users.sql
psql -d secondbrain -f 02_notes.sql
psql -d secondbrain -f 03_note_embeddings.sql
psql -d secondbrain -f 04_chat.sql
psql -d secondbrain -f 05_indexing_jobs.sql
psql -d secondbrain -f 06_indexes.sql
psql -d secondbrain -f 07_generated_images.sql
psql -d secondbrain -f 08_search_vectors.sql
psql -d secondbrain -f 09_rag_analytics.sql
psql -d secondbrain -f 10_brainstorm.sql
psql -d secondbrain -f 11_message_images.sql
psql -d secondbrain -f 12_agent_rag_enabled.sql
psql -d secondbrain -f 13_postgresql_18_features.sql
```

### Option 4: From psql Prompt

```sql
\c secondbrain
\i schema.sql
```

## Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `user_preferences` | User settings (1:1 with users) |
| `notes` | User notes with tags (supports soft delete) |
| `note_embeddings` | Vector embeddings for RAG with BM25 search |
| `chat_conversations` | AI chat sessions (supports soft delete) |
| `chat_messages` | Individual chat messages |
| `tool_calls` | Agent tool executions |
| `retrieved_notes` | RAG context per message |
| `indexing_jobs` | Embedding job tracking |
| `generated_images` | AI-generated images |
| `rag_query_logs` | RAG query analytics and feedback |
| `brainstorm_sessions` | Brainstorming sessions |
| `brainstorm_results` | AI-generated brainstorm outputs |
| `message_images` | User-uploaded images for vision models |

**Note:** The `__EFMigrationsHistory` table is also created by Entity Framework Core at runtime.

### Entity Relationship Diagram

```text
┌─────────────────┐
│     users       │
├─────────────────┤         ┌──────────────────────┐
│ id (PK)         │────────▶│  user_preferences    │
│ email           │   1:1   │  user_id (FK)        │
│ password_hash   │         │  smart_prompts_*     │
│ display_name    │         └──────────────────────┘
│ api_key         │
└─────────────────┘
        │
        │ (user_id - no FK, application-level)
        ▼
┌─────────────────┐         ┌──────────────────────┐
│     notes       │         │   note_embeddings    │
├─────────────────┤         ├──────────────────────┤
│ id (PK)         │────────▶│ note_id              │
│ title           │   1:N   │ embedding (vector)   │
│ content         │         │ chunk_index          │
│ tags[]          │         │ search_vector        │
│ user_id         │         │ note_updated_at      │
│ is_deleted      │         └──────────────────────┘
│ deleted_at      │
└─────────────────┘

┌─────────────────────┐
│  chat_conversations │
├─────────────────────┤         ┌──────────────────┐
│ id (PK)             │────────▶│  chat_messages   │
│ title               │   1:N   ├──────────────────┤
│ provider            │         │ id (PK)          │
│ model               │         │ conversation_id  │
│ rag_enabled         │         │ role             │
│ agent_enabled       │         │ content          │
│ agent_rag_enabled   │         └────────┬─────────┘
│ image_gen_enabled   │                  │
│ is_deleted          │                  │ 1:N
│ user_id             │  ┌───────────────┼───────────────────┐
└─────────────────────┘  │               │                   │
                         │               │                   │
          ┌──────────────▼──┐  ┌────────▼────────┐  ┌───────▼────────┐
          │   tool_calls    │  │ retrieved_notes │  │generated_images│
          ├─────────────────┤  ├─────────────────┤  ├────────────────┤
          │ message_id(FK)  │  │ message_id (FK) │  │ message_id(FK) │
          │ tool_name       │  │ note_id         │  │ base64_data    │
          │ arguments       │  │ relevance_score │  │ revised_prompt │
          │ result          │  │ chunk_content   │  │ width, height  │
          └─────────────────┘  └─────────────────┘  └────────────────┘
                                                            │
                                                            │
                                             ┌──────────────▼──────────────┐
                                             │       message_images       │
                                             ├────────────────────────────┤
                                             │ message_id (FK)            │
                                             │ base64_data                │
                                             │ media_type                 │
                                             │ file_name                  │
                                             └────────────────────────────┘

┌─────────────────┐
│  indexing_jobs  │
├─────────────────┤
│ id (PK)         │
│ user_id         │
│ status          │
│ total_notes     │
│ processed_notes │
└─────────────────┘

┌─────────────────────┐
│  brainstorm_sessions│
├─────────────────────┤         ┌──────────────────────┐
│ id (PK)             │────────▶│  brainstorm_results  │
│ title               │   1:N   ├──────────────────────┤
│ prompt              │         │ session_id (FK)      │
│ user_id             │         │ provider             │
│ created_at          │         │ model                │
└─────────────────────┘         │ content              │
                                │ result_type          │
                                └──────────────────────┘

┌─────────────────────┐
│   rag_query_logs    │
├─────────────────────┤
│ id (PK)             │
│ user_id             │
│ query               │
│ timing metrics      │
│ score metrics       │
│ user_feedback       │
│ topic_cluster       │
└─────────────────────┘
```

### Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| users | ix_users_email | UNIQUE | Login lookups |
| users | ix_users_api_key | BTREE | API authentication |
| user_preferences | ix_user_preferences_user_id | UNIQUE | 1:1 lookup |
| notes | ix_notes_user_id | BTREE | Filter by user |
| notes | ix_notes_user_external | BTREE | Import lookups |
| notes | ix_notes_created_at | BTREE | Sort by date |
| notes | ix_notes_user_updated | BTREE | User + updated sort |
| notes | ix_notes_user_folder | BTREE | User + folder filter |
| notes | ix_notes_user_archived | BTREE | User + archived filter |
| notes | ix_notes_user_deleted | BTREE | Soft delete queries |
| note_embeddings | ix_note_embeddings_note_id | BTREE | Get note chunks |
| note_embeddings | ix_note_embeddings_user_id | BTREE | Filter by user |
| note_embeddings | ix_note_embeddings_note_chunk | BTREE | Chunk lookup |
| note_embeddings | ix_embeddings_user_note | BTREE | User + note lookup |
| note_embeddings | idx_note_embeddings_search_vector | GIN | Full-text search |
| chat_conversations | ix_chat_conversations_user_id | BTREE | Filter by user |
| chat_conversations | ix_chat_conversations_updated_at | BTREE | Sort by recent |
| chat_conversations | ix_conversations_user_updated | BTREE | User + updated sort |
| chat_conversations | ix_conversations_user_deleted | BTREE | Soft delete queries |
| chat_messages | ix_chat_messages_conversation_id | BTREE | Get messages |
| chat_messages | ix_chat_messages_timestamp | BTREE | Sort by time |
| tool_calls | ix_tool_calls_message_id | BTREE | Get tool calls |
| retrieved_notes | ix_retrieved_notes_message_id | BTREE | Get RAG context |
| indexing_jobs | ix_indexing_jobs_user_id | BTREE | Filter by user |
| indexing_jobs | ix_indexing_jobs_created_at | BTREE | Sort by date |
| indexing_jobs | ix_indexing_jobs_user_created | BTREE | User + date |
| generated_images | ix_generated_images_message_id | BTREE | Get images |
| rag_query_logs | idx_rag_query_logs_user_id | BTREE | Filter by user |
| rag_query_logs | idx_rag_query_logs_created_at | BTREE | Sort by date |
| rag_query_logs | idx_rag_query_logs_user_feedback | BTREE | Filter by feedback (partial) |
| rag_query_logs | idx_rag_query_logs_conversation | BTREE | Filter by conversation |
| rag_query_logs | idx_rag_query_logs_topic_cluster | BTREE | Filter by topic (partial) |
| rag_query_logs | ix_rag_logs_user_created | BTREE | User + created sort |
| brainstorm_sessions | ix_brainstorm_sessions_user_id | BTREE | Filter by user |
| brainstorm_sessions | ix_brainstorm_sessions_created_at | BTREE | Sort by date |
| brainstorm_results | ix_brainstorm_results_session_id | BTREE | Get results |
| brainstorm_results | ix_brainstorm_results_type | BTREE | Filter by type |
| message_images | ix_message_images_message_id | BTREE | Get images |

## Vector Search

The `note_embeddings` table uses pgvector's `vector(1536)` type for storing OpenAI-compatible embeddings.

### Example: Semantic Search Query

```sql
-- Find similar notes using cosine distance
SELECT 
    ne.note_id,
    ne.note_title,
    ne.content,
    ne.embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM note_embeddings ne
WHERE ne.user_id = 'user-123'
ORDER BY ne.embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

### Hybrid Search (Vector + BM25)

```sql
-- Combine vector search with full-text search using RRF
WITH vector_results AS (
    SELECT note_id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS vrank
    FROM note_embeddings WHERE user_id = $2
    LIMIT 20
),
bm25_results AS (
    SELECT note_id, ROW_NUMBER() OVER (ORDER BY ts_rank(search_vector, query) DESC) AS brank
    FROM note_embeddings, plainto_tsquery('english', $3) query
    WHERE user_id = $2 AND search_vector @@ query
    LIMIT 20
)
SELECT note_id, 1.0/(60+vrank) + 1.0/(60+brank) AS rrf_score
FROM vector_results FULL OUTER JOIN bm25_results USING (note_id)
ORDER BY rrf_score DESC;
```

### Creating a Vector Index (Optional)

For large datasets, create an IVFFlat or HNSW index:

```sql
-- IVFFlat index (good for 10K-1M vectors)
CREATE INDEX ON note_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- HNSW index (better for larger datasets)
CREATE INDEX ON note_embeddings 
USING hnsw (embedding vector_cosine_ops);
```

## Files

| File | Description |
|------|-------------|
| `00_extensions.sql` | pgvector + pg_stat_statements extensions |
| `01_users.sql` | users, user_preferences tables |
| `02_notes.sql` | notes table (with soft delete columns) |
| `03_note_embeddings.sql` | Vector embeddings table with note_updated_at |
| `04_chat.sql` | Chat-related tables (with soft delete columns) |
| `05_indexing_jobs.sql` | Job tracking table |
| `06_indexes.sql` | Base index definitions |
| `07_generated_images.sql` | AI-generated images table |
| `08_search_vectors.sql` | Full-text search vectors and RAG query logs |
| `09_rag_analytics.sql` | RAG analytics/topic clustering columns |
| `10_brainstorm.sql` | Brainstorm sessions and results tables |
| `11_message_images.sql` | User-uploaded message images table |
| `12_agent_rag_enabled.sql` | agent_rag_enabled column for chat_conversations |
| `13_postgresql_18_features.sql` | **PostgreSQL 18 features: UUIDv7, JSONB, optimized indexes** |
| `13_postgresql_18_features_rollback.sql` | Rollback script for PG18 features |
| `migrate.sh` | **Migration script for Docker + Desktop databases** |
| `schema.sql` | Master script (runs all 14 scripts) |
| `POSTGRESQL_18_FEATURES.md` | **PostgreSQL 18 features guide and migration instructions** |

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for UTC storage
- Arrays use PostgreSQL `TEXT[]` type for tags and errors
- Foreign keys use `ON DELETE CASCADE` for automatic cleanup
- The schema matches Entity Framework Core entity definitions in `backend/src/SecondBrain.Core/Entities/`
- Hybrid search uses Reciprocal Rank Fusion (RRF) to combine vector and BM25 results
- Soft delete is supported on `notes` and `chat_conversations` tables via `is_deleted`, `deleted_at`, `deleted_by` columns
- Total indexes: 53 (including primary keys and partial indexes)
- The desktop app (Tauri) uses Homebrew PostgreSQL on port 5433, Docker uses port 5432

## PostgreSQL 18 Optimization

For advanced PostgreSQL 18 features including:

- **UUIDv7** for time-ordered, high-performance primary keys
- **Async I/O (AIO)** for 2-3x faster sequential scans
- **pgvector 0.8** optimizations for filtered vector queries
- **MERGE with RETURNING** for atomic upsert operations
- **JSON_TABLE** for cleaner JSON data querying
- **Virtual/Stored Generated Columns** for computed fields
- **Temporal Constraints** for audit trails

See the comprehensive **[PostgreSQL 18 Features Guide](./POSTGRESQL_18_FEATURES.md)** for detailed implementation instructions, migration scripts, and code examples.
