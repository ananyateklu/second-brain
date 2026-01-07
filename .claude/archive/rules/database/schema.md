# Database Schema

## Overview

PostgreSQL 18 + pgvector with dual schema strategy.

| Deployment | Schema Source | Port | Init Method |
|------------|---------------|------|-------------|
| **Docker** | SQL scripts (`database/*.sql`) | 5432 | Container init scripts |
| **Desktop (Tauri)** | EF Core migrations | 5433 | `Program.cs` startup |

## Core Tables (29 tables)

### User & Notes (8)

| Table | Purpose |
|-------|---------|
| `users` | Accounts with api_key, password_hash |
| `user_preferences` | 40+ settings (1:1 with users) |
| `notes` | Content with soft delete, folder, source |
| `note_embeddings` | Vector chunks + BM25 search_vector |
| `note_images` | Images within notes (multimodal) |
| `note_versions` | Temporal history (WITHOUT OVERLAPS) |
| `note_summaries` | AI-generated summaries |
| `summary_jobs` | Background summary generation |

### Chat & Agents (8)

| Table | Purpose |
|-------|---------|
| `chat_conversations` | Sessions with provider, model, settings |
| `chat_messages` | Messages with tokens, duration_ms |
| `chat_sessions` | Temporal tracking (WITHOUT OVERLAPS) |
| `message_images` | User/generated images in messages |
| `tool_calls` | Agent tool executions with thought_signature |
| `thinking_steps` | Reasoning/thinking with timestamps |
| `retrieved_notes` | RAG context per message |
| `generated_images` | AI-generated images |

### Voice (2)

| Table | Purpose |
|-------|---------|
| `voice_sessions` | Voice conversation metadata |
| `voice_turns` | Individual voice turns |

### Focus (2)

| Table | Purpose |
|-------|---------|
| `focus_items` | Productivity tasks with timer |
| `focus_suggestions` | AI suggestions with embeddings |

### Analytics & AI (6)

| Table | Purpose |
|-------|---------|
| `indexing_jobs` | Note embedding jobs |
| `rag_query_logs` | RAG query analytics + feedback |
| `gemini_context_caches` | Gemini API caching |
| `claude_cache_stats` | Claude prompt caching |
| `claude_batch_jobs` | Claude batch processing |
| `claude_citations` | Document citations |

### Other (3)

- `brainstorm_sessions`, `brainstorm_results`
- `__EFMigrationsHistory`

## PostgreSQL 18 Features

### UUIDv7

Time-ordered IDs via `uuidv7()` default.

Used in: notes, chat_*, note_embeddings, voice_*

### Temporal Tables with WITHOUT OVERLAPS

```sql
-- note_versions: Track edit history
CONSTRAINT note_versions_no_overlap
  EXCLUDE USING gist (note_id WITH =, valid_period WITH &&)

-- chat_sessions: Non-overlapping user sessions
UNIQUE (user_id, conversation_id, session_period WITHOUT OVERLAPS)
```

### Variable Dimension Embeddings

Supports 768, 1024, 1536, 3072 dimensions with dimension-specific HNSW indexes.

### Advanced Indexes (53+)

| Type | Purpose |
|------|---------|
| **BRIN** | Time-series data (100x smaller than B-tree) |
| **GiST** | Temporal range queries |
| **HNSW** | Vector similarity (m=24, ef_construction=128) |
| **Covering** | INCLUDE for index-only scans |
| **Partial** | Soft delete optimization |
| **GIN** | Full-text search |

## Vector Search

```sql
-- Semantic search (cosine distance)
SELECT note_id, embedding <=> $1::vector AS distance
FROM note_embeddings WHERE user_id = $2
ORDER BY embedding <=> $1::vector LIMIT 5;

-- Hybrid: Vector + BM25 with RRF fusion
-- See RagService.cs for full implementation
```

## Migration Management

```bash
./database/migrate.sh status      # Check migration state
./database/migrate.sh run         # Apply pending migrations
./database/migrate.sh diff        # Compare Docker vs Desktop schemas
./database/migrate.sh backup      # Create pg_dump backups
```

## Key Files

| File | Purpose |
|------|---------|
| `database/migrate.sh` | Unified migration tool |
| `database/schema.sql` | Master schema runner |
| `database/*.sql` (59 files) | Individual schema components |
| `backend/.../Migrations/` (13 migrations) | EF Core migrations |
| `backend/.../Data/DatabaseIndexInitializer.cs` | Performance indexes |

## Soft Delete Tables

These tables use `is_deleted` column - always filter with `WHERE is_deleted = false`:
- `notes`
- `chat_conversations`
- `focus_items`
- `focus_suggestions`
