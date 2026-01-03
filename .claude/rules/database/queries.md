# Database Queries

## MCP Tools Available

Claude has direct PostgreSQL access via MCP.

| Tool | Purpose |
|------|---------|
| `mcp__pg-docker__execute_sql` | Execute SQL queries (SELECT, INSERT, UPDATE, DELETE) |
| `mcp__pg-docker__search_objects` | Search for schemas, tables, columns, indexes |

## Before Writing SQL

1. **Read schema reference**: `database/SCHEMA_REFERENCE.md` has all table schemas
2. **Use search_objects first**: Verify table/column names before querying
3. **Check column types**: Especially for arrays, JSONB, vectors, timestamps

## Common Pitfalls to Avoid

```sql
-- WRONG: Forgetting soft delete filter
SELECT * FROM notes WHERE user_id = $1;

-- CORRECT: Always filter is_deleted
SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false;

-- WRONG: Text comparison on array column
SELECT * FROM notes WHERE tags = 'mytag';

-- CORRECT: Array contains check
SELECT * FROM notes WHERE 'mytag' = ANY(tags);

-- WRONG: Unquoted column names that are reserved words
SELECT user, role FROM chat_messages;

-- CORRECT: Quote reserved words
SELECT "user", role FROM chat_messages;

-- WRONG: Comparing uuid to text directly
SELECT * FROM voice_sessions WHERE id = 'some-id';

-- CORRECT: Cast explicitly
SELECT * FROM voice_sessions WHERE id = 'some-id'::uuid;
```

## Query Patterns by Table

### Notes Queries

```sql
-- Active notes for user
SELECT id, title, folder, tags, updated_at
FROM notes
WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC;

-- Notes in folder
SELECT * FROM notes
WHERE folder = $1 AND user_id = $2 AND is_deleted = false;

-- Search by tag
SELECT * FROM notes
WHERE $1 = ANY(tags) AND is_deleted = false;
```

### Chat Queries

```sql
-- Recent conversations
SELECT id, title, provider, model, created_at
FROM chat_conversations
WHERE user_id = $1 AND is_deleted = false
ORDER BY updated_at DESC LIMIT 20;

-- Messages with tokens
SELECT role, content, input_tokens, output_tokens, duration_ms
FROM chat_messages
WHERE conversation_id = $1
ORDER BY timestamp;
```

### Analytics Queries

```sql
-- Token usage by provider
SELECT
    cc.provider,
    SUM(cm.input_tokens) as total_input,
    SUM(cm.output_tokens) as total_output
FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
WHERE cc.user_id = $1
GROUP BY cc.provider;

-- RAG performance
SELECT
    AVG(total_time_ms) as avg_time,
    AVG(avg_rerank_score) as avg_score,
    COUNT(*) as query_count
FROM rag_query_logs
WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days';
```

## Write Operations

For INSERT/UPDATE/DELETE:

1. Always include user_id constraint for security
2. Use RETURNING to get affected rows
3. Prefer soft delete (set is_deleted = true) over hard delete

```sql
-- Soft delete pattern
UPDATE notes
SET is_deleted = true, deleted_at = NOW(), deleted_by = $2
WHERE id = $1 AND user_id = $2
RETURNING id, title;

-- Update with returning
UPDATE focus_items
SET status = 'completed', completed_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;
```
