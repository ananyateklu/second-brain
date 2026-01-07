# Critical Rules (Always Follow)

## Database Queries

**Soft Delete Tables** - Always add `WHERE is_deleted = false`:
- `notes`, `chat_conversations`, `focus_items`, `focus_suggestions`

```sql
-- CORRECT
SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false;

-- WRONG (missing filter)
SELECT * FROM notes WHERE user_id = $1;
```

**Array Columns** - Use ANY() for array containment:
```sql
-- CORRECT
SELECT * FROM notes WHERE 'mytag' = ANY(tags);

-- WRONG
SELECT * FROM notes WHERE tags = 'mytag';
```

**UUID Comparison** - Cast explicitly:
```sql
WHERE id = 'some-uuid'::uuid
```

## Backend Patterns

**Result Pattern** - All handlers return `Result<T>`:
```csharp
// In handler
return Result<NoteResponse>.Success(response);
return Result<NoteResponse>.Failure(Error.NotFound("Note not found"));

// In controller
return result.Match(
    onSuccess: note => Ok(note),
    onFailure: error => error.Code == "NotFound" ? NotFound(error) : BadRequest(error)
);
```

**CQRS Structure**:
- Commands: `Application/Commands/{Domain}/{Operation}/`
- Queries: `Application/Queries/{Domain}/{Operation}/`
- Auto-registered via MediatR assembly scanning

## MCP Tools

**Unified PostgreSQL Server** (supports both docker and desktop):
```
mcp__pg__execute_sql        # database: "docker" | "desktop"
mcp__pg__search_objects     # Search tables, columns, indexes
mcp__pg__get_foreign_keys   # Discover relationships
mcp__pg__get_table_sizes    # Disk usage stats
mcp__pg__suggest_table      # Fuzzy table name matching
```

## Common Pitfalls

1. **Forgetting soft delete filter** - Most queries need `is_deleted = false`
2. **Array syntax** - PostgreSQL arrays use `= ANY()` not `=`
3. **Missing user_id filter** - Always scope queries to user
4. **Not using Result pattern** - Never throw exceptions in handlers
