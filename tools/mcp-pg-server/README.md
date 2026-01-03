# Second Brain PostgreSQL MCP Server

Enhanced PostgreSQL MCP (Model Context Protocol) server with intelligent query helpers, safety features, and fuzzy matching.

## Features

### 1. `execute_sql` - Enhanced SQL Execution

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sql` | string | required | SQL query to execute |
| `auto_limit` | number | 100 | Auto-add LIMIT to SELECT queries. Set to 0 to disable |
| `validate_only` | boolean | false | Validate SQL syntax without executing |
| `dry_run` | boolean | false | Execute write operations in transaction then rollback |
| `explain` | boolean | false | Return EXPLAIN ANALYZE output for query optimization |

**Safety Features:**
- Automatic LIMIT injection prevents runaway queries
- EXPLAIN-based validation mode for syntax checking
- Dry run mode for safe INSERT/UPDATE/DELETE previews
- Fuzzy table name suggestions on "relation does not exist" errors

**Example:**
```json
{
  "sql": "SELECT * FROM notes WHERE user_id = $1",
  "auto_limit": 100,
  "validate_only": false
}
```

### 2. `search_objects` - Enhanced Schema Discovery

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `object_type` | string | required | One of: schema, table, column, procedure, index |
| `pattern` | string | "%" | LIKE pattern (% = any, _ = single char) |
| `schema` | string | "public" | Schema to search in |
| `table` | string | - | Filter to specific table |
| `detail_level` | string | "names" | One of: names, summary, full |
| `limit` | number | 100 | Max results (max: 1000) |
| `include_deleted` | boolean | false | Include deleted records in counts |
| `fuzzy_match` | boolean | true | Enable fuzzy matching suggestions |

### 3. `get_soft_delete_tables` - Soft Delete Reference

Returns list of tables using soft delete pattern (`is_deleted` column):
- notes
- chat_conversations
- focus_items
- focus_suggestions

### 4. `suggest_table` - Fuzzy Table Name Matching

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | required | Table name to match |
| `max_suggestions` | number | 5 | Maximum suggestions |

### 5. `get_foreign_keys` - Relationship Discovery

Discover foreign key relationships between tables.

### 6. `get_table_sizes` - Disk Usage Statistics

Get disk usage statistics for tables including total size, index size, and row counts.

### 7. `search_columns` - Cross-table Column Search

Search for columns by pattern across ALL tables.

## Installation

```bash
cd tools/mcp-pg-server
pnpm install
pnpm build
```

## Configuration

### Environment Variables (Recommended)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/secondbrain` |

### Option 1: Using env section in .mcp.json (Recommended)

```json
{
  "mcpServers": {
    "pg-docker": {
      "command": "node",
      "args": ["./tools/mcp-pg-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/database?sslmode=disable"
      }
    }
  }
}
```

### Option 2: Command Line Argument

```json
{
  "mcpServers": {
    "pg-docker": {
      "command": "node",
      "args": [
        "./tools/mcp-pg-server/dist/index.js",
        "--dsn=postgresql://user:password@localhost:5432/database"
      ]
    }
  }
}
```

### Option 3: Shell Environment Variable

Set in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

## Error Handling

When a table doesn't exist, the server provides suggestions:

```json
{
  "success": false,
  "error": "relation \"nots\" does not exist",
  "suggestions": ["notes", "note_embeddings"],
  "hint": "Did you mean: notes, note_embeddings?"
}
```

## Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build
```

## Security Notes

- Never commit `.mcp.json` with credentials to version control
- Use `.mcp.json.example` as a template
- Store credentials in environment variables or secure vaults
