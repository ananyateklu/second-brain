# Second Brain Notes MCP Server

An MCP (Model Context Protocol) server that enables Claude Code to create, read, update, delete, search, and manage version history for notes in Second Brain.

## Features

- **CRUD Operations**: Create, read, update, and delete notes
- **Search**: Text search across notes
- **Version History**: View and restore previous versions (PostgreSQL 18 temporal tables)
- **Pagination**: Efficient listing with filters
- **Folders & Tags**: Organize notes with folders and tags

## Prerequisites

- Node.js 18+
- Second Brain backend running on `localhost:5001`
- Valid API key from Second Brain

## Installation

```bash
cd tools/mcp-notes-server
bun install
bun build
```

## Configuration

### 1. Set Environment Variable

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SECOND_BRAIN_API_KEY="your-api-key-here"
```

Reload your shell or run `source ~/.zshrc`.

### 2. Configure Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "second-brain-notes": {
      "command": "node",
      "args": ["/Users/ananyateklu/Dev/second-brain/tools/mcp-notes-server/dist/index.js"],
      "env": {
        "SECOND_BRAIN_API_URL": "http://localhost:5001/api"
      }
    }
  }
}
```

### 3. Restart Claude Code

The MCP server will be available after restarting Claude Code.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create a new note with title, content, tags, folder |
| `get_note` | Get a note by ID with full content |
| `update_note` | Partial update of note fields |
| `delete_note` | Soft delete a note (can be restored) |
| `list_notes` | List notes with pagination and filters |
| `search_notes` | Search notes by text query |
| `get_note_versions` | Get version history for a note |
| `restore_note_version` | Restore a note to a previous version |

## Usage Examples

### Create a Note

```
Create a note titled "Meeting Notes" with content about today's standup
```

### Search Notes

```
Search for notes about "authentication"
```

### List Notes in a Folder

```
List all notes in the "Projects" folder
```

### View Version History

```
Show me the version history for note ID xyz
```

### Restore a Version

```
Restore note xyz to version 2
```

## Development

```bash
# Run in development mode
bun dev

# Build
bun build

# Run production
bun start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECOND_BRAIN_API_URL` | Base URL for the API | `http://localhost:5001/api` |
| `SECOND_BRAIN_API_KEY` | API key for authentication | (required) |

## Command Line Arguments

Override environment variables:

```bash
node dist/index.js --api-url=http://localhost:5001/api --api-key=your-key
```

## Troubleshooting

### "No API key provided" warning

Ensure `SECOND_BRAIN_API_KEY` is set in your environment or passed via `--api-key`.

### Connection refused

Make sure the Second Brain backend is running on the configured URL (default: `localhost:5001`).

### 401 Unauthorized

Your API key may be invalid. Generate a new one from the Second Brain settings.
