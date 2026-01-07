---
name: database-queries
description: PostgreSQL database queries, schema design, and migrations. Use when user asks to write SQL queries, design database tables, create migrations, work with pgvector embeddings, or troubleshoot database issues. Triggers on SQL code, schema changes, index optimization, or vector search patterns.
---

# Database Queries & PostgreSQL Patterns

## MCP Tools Available

```text
mcp__pg__execute_sql      # database: "docker" (5432) | "desktop" (5433)
mcp__pg__search_objects   # Search tables, columns, indexes
mcp__pg__get_foreign_keys # Discover relationships
mcp__pg__get_table_sizes  # Disk usage stats
mcp__pg__suggest_table    # Fuzzy table name matching
mcp__pg__search_columns   # Find columns by pattern
```

## CRITICAL: Soft Delete Tables

**ALWAYS** filter with `WHERE is_deleted = false` for these tables:

- `notes`
- `chat_conversations`
- `focus_items`
- `focus_suggestions`

```sql
-- CORRECT
SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false;

-- WRONG (missing soft delete filter!)
SELECT * FROM notes WHERE user_id = $1;
```

## Common Query Pitfalls

### Array Columns - Use ANY()

```sql
-- CORRECT
SELECT * FROM notes WHERE 'mytag' = ANY(tags) AND is_deleted = false;

-- WRONG
SELECT * FROM notes WHERE tags = 'mytag';
```

### UUID Comparison - Explicit Cast

```sql
-- CORRECT
WHERE id = 'some-uuid'::uuid

-- WRONG (may cause type mismatch)
WHERE id = 'some-uuid'
```

### Reserved Words - Quote Them

```sql
-- CORRECT
SELECT "user", role FROM chat_messages;

-- WRONG
SELECT user, role FROM chat_messages;
```

## Core Tables (29)

| Category | Tables |
|----------|--------|
| User & Notes | `users`, `user_preferences`, `notes`, `note_embeddings`, `note_images`, `note_versions`, `note_summaries`, `summary_jobs` |
| Chat & Agents | `chat_conversations`, `chat_messages`, `chat_sessions`, `message_images`, `tool_calls`, `thinking_steps`, `retrieved_notes`, `generated_images` |
| Voice | `voice_sessions`, `voice_turns` |
| Focus | `focus_items`, `focus_suggestions` |
| Analytics | `indexing_jobs`, `rag_query_logs`, `gemini_context_caches`, `claude_cache_stats`, `claude_batch_jobs`, `claude_citations` |

## Standard Query Patterns

### Active Notes for User

```sql
SELECT id, title, folder, tags, updated_at
FROM notes
WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC;
```

### Notes by Tag

```sql
SELECT * FROM notes
WHERE $1 = ANY(tags) AND is_deleted = false;
```

### Recent Conversations

```sql
SELECT id, title, provider, model
FROM chat_conversations
WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC LIMIT 20;
```

### Soft Delete Pattern

```sql
UPDATE notes
SET is_deleted = true, deleted_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, title;
```

## Vector Search (pgvector)

```sql
-- Semantic search with cosine distance
SELECT note_id, embedding <=> $1::vector AS distance
FROM note_embeddings
WHERE user_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- Hybrid search (vector + full-text)
SELECT n.id, n.title,
       ne.embedding <=> $1::vector AS vector_distance,
       ts_rank(to_tsvector('english', n.content), plainto_tsquery($2)) AS text_rank
FROM notes n
JOIN note_embeddings ne ON n.id = ne.note_id
WHERE n.user_id = $3 AND n.is_deleted = false
ORDER BY vector_distance + (1 - text_rank)
LIMIT 10;
```

## PostgreSQL 18 Features

- **UUIDv7**: Time-ordered IDs via `uuidv7()` default
- **Temporal tables**: `note_versions`, `chat_sessions` with `WITHOUT OVERLAPS`
- **Variable embeddings**: 768, 1024, 1536, 3072 dimensions with HNSW indexes
- **Advanced indexes**: BRIN (time-series), GiST (temporal), HNSW (vectors), GIN (full-text)

## Index Types

```sql
-- HNSW for vector similarity
CREATE INDEX ON note_embeddings USING hnsw (embedding vector_cosine_ops);

-- GIN for full-text search
CREATE INDEX ON notes USING gin (to_tsvector('english', content));

-- BRIN for time-series data
CREATE INDEX ON chat_messages USING brin (created_at);

-- B-tree for lookups
CREATE INDEX ON notes (user_id, is_deleted, updated_at DESC);
```

## Migration Commands

```bash
./database/migrate.sh status   # Check migration state
./database/migrate.sh run      # Apply pending migrations
./database/migrate.sh diff     # Compare Docker vs Desktop
```

## Database Selection

- **Docker** (port 5432): Development/CI environment
- **Desktop** (port 5433): Tauri embedded PostgreSQL

Always specify which database when using MCP tools:

```text
database: "docker"   # or "desktop"
```
