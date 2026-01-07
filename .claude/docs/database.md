# Database Patterns

## MCP Tools (Unified Server)

```
mcp__pg__execute_sql      # database: "docker" (5432) | "desktop" (5433)
mcp__pg__search_objects   # Search tables, columns, indexes
mcp__pg__get_foreign_keys # Discover relationships
mcp__pg__get_table_sizes  # Disk usage stats
mcp__pg__suggest_table    # Fuzzy table name matching
```

## Soft Delete Tables

Always filter with `WHERE is_deleted = false`:
- `notes`, `chat_conversations`, `focus_items`, `focus_suggestions`

## Common Query Pitfalls

```sql
-- Soft delete (ALWAYS add filter)
SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false;

-- Array columns (use ANY)
SELECT * FROM notes WHERE 'mytag' = ANY(tags);

-- UUID comparison (explicit cast)
WHERE id = 'some-uuid'::uuid;

-- Reserved words (quote them)
SELECT "user", role FROM chat_messages;
```

## Core Tables (29)

| Category | Tables |
|----------|--------|
| User & Notes | `users`, `user_preferences`, `notes`, `note_embeddings`, `note_images`, `note_versions`, `note_summaries`, `summary_jobs` |
| Chat & Agents | `chat_conversations`, `chat_messages`, `chat_sessions`, `message_images`, `tool_calls`, `thinking_steps`, `retrieved_notes`, `generated_images` |
| Voice | `voice_sessions`, `voice_turns` |
| Focus | `focus_items`, `focus_suggestions` |
| Analytics | `indexing_jobs`, `rag_query_logs`, `gemini_context_caches`, `claude_cache_stats`, `claude_batch_jobs`, `claude_citations` |

## PostgreSQL 18 Features

- **UUIDv7**: Time-ordered IDs via `uuidv7()` default
- **Temporal tables**: `note_versions`, `chat_sessions` with `WITHOUT OVERLAPS`
- **Variable embeddings**: 768, 1024, 1536, 3072 dimensions with HNSW indexes
- **Advanced indexes**: BRIN (time-series), GiST (temporal), HNSW (vectors), GIN (full-text)

## Query Patterns

```sql
-- Active notes for user
SELECT id, title, folder, tags, updated_at
FROM notes WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC;

-- Notes by tag
SELECT * FROM notes WHERE $1 = ANY(tags) AND is_deleted = false;

-- Recent conversations
SELECT id, title, provider, model
FROM chat_conversations
WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC LIMIT 20;

-- Soft delete pattern
UPDATE notes SET is_deleted = true, deleted_at = NOW()
WHERE id = $1 AND user_id = $2 RETURNING id, title;
```

## Vector Search

```sql
-- Semantic search (cosine distance)
SELECT note_id, embedding <=> $1::vector AS distance
FROM note_embeddings WHERE user_id = $2
ORDER BY embedding <=> $1::vector LIMIT 5;
```

## Migration Commands

```bash
./database/migrate.sh status   # Check state
./database/migrate.sh run      # Apply migrations
./database/migrate.sh diff     # Compare Docker vs Desktop
```
