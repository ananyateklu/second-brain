#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { ApiClient } from './api-client.js';
import type { ApiConfig } from './types.js';
import {
  handleCreateNote,
  handleGetNote,
  handleUpdateNote,
  handleDeleteNote,
  handleListNotes,
  handleSearchNotes,
  handleGetVersions,
  handleRestoreVersion,
} from './handlers/index.js';

// Tool definitions
const tools: Tool[] = [
  // === CRUD Operations ===
  {
    name: 'create_note',
    description: `Create a new note in Second Brain.

Returns the created note with ID, timestamps, and all metadata.

Example use cases:
- Capturing ideas or thoughts during development
- Creating documentation notes
- Saving research findings
- Logging decisions or learnings`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the note (required, max 200 chars)',
        },
        content: {
          type: 'string',
          description: 'Content of the note in markdown format (required)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization (optional, max 20 tags)',
        },
        folder: {
          type: 'string',
          description: 'Folder name to organize the note (optional)',
        },
        isArchived: {
          type: 'boolean',
          description: 'Whether to create the note as archived (default: false)',
          default: false,
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'get_note',
    description: `Get a note by its ID with full content.

Returns the complete note including:
- Full content (not just summary)
- All metadata (tags, folder, timestamps)
- Version info and images if present

Use this after list_notes or search_notes to get full content.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The note ID (UUID format)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_note',
    description: `Update an existing note. Supports partial updates.

Only provide the fields you want to change - omitted fields remain unchanged.

Examples:
- Update just the title: { id: "...", title: "New Title" }
- Add tags: { id: "...", tags: ["tag1", "tag2"] }
- Move to folder: { id: "...", folder: "Projects", updateFolder: true }
- Remove from folder: { id: "...", folder: null, updateFolder: true }`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to update (required)',
        },
        title: {
          type: 'string',
          description: 'New title (optional)',
        },
        content: {
          type: 'string',
          description: 'New content in markdown (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags - replaces existing tags (optional)',
        },
        folder: {
          type: 'string',
          description: 'New folder name or null to remove (optional)',
        },
        updateFolder: {
          type: 'boolean',
          description: 'Set to true when you want to change/clear the folder',
        },
        isArchived: {
          type: 'boolean',
          description: 'Archive or unarchive the note (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: `Soft delete a note (moves to trash, can be restored via version history).

The note is not permanently deleted - it can be restored later.
Returns success confirmation.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to delete',
        },
      },
      required: ['id'],
    },
  },

  // === List and Search ===
  {
    name: 'list_notes',
    description: `List notes with optional filtering and pagination.

Returns lightweight note items (summary, not full content).
Use get_note to retrieve full content of specific notes.

Filters:
- folder: Filter by folder name (empty string = unfiled notes)
- includeArchived: Include archived notes (default: false)
- search: Text search in title/content

Pagination:
- page: Page number (1-based)
- pageSize: Items per page (default 20, max 100)`,
    inputSchema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: "Filter by folder name. Empty string '' = unfiled notes only",
        },
        includeArchived: {
          type: 'boolean',
          description: 'Include archived notes (default: false)',
          default: false,
        },
        search: {
          type: 'string',
          description: 'Search query (searches title and content)',
        },
        page: {
          type: 'number',
          description: 'Page number, 1-based (default: 1)',
          default: 1,
        },
        pageSize: {
          type: 'number',
          description: 'Items per page (default: 20, max: 100)',
          default: 20,
        },
      },
    },
  },
  {
    name: 'search_notes',
    description: `Search for notes by text query.

Finds notes matching the search query in title or content.
Returns matched notes with their metadata.

Parameters:
- query: Search query text (required)
- maxResults: Maximum notes to return (default: 5)`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },

  // === Version History ===
  {
    name: 'get_note_versions',
    description: `Get version history for a note (PostgreSQL 18 temporal tables).

Returns all previous versions of a note with:
- Version numbers and timestamps
- Content at each version
- Who made changes and how (web, agent, API)
- AI provider/model if modified by AI agent

Useful for:
- Reviewing change history
- Finding when content was modified
- Comparing versions before restoring`,
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'The note ID to get history for',
        },
        skip: {
          type: 'number',
          description: 'Number of versions to skip (for pagination)',
          default: 0,
        },
        take: {
          type: 'number',
          description: 'Number of versions to retrieve (default: 50)',
          default: 50,
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'restore_note_version',
    description: `Restore a note to a previous version.

Creates a NEW version with the content from the target version.
The current content is preserved in version history.

This is non-destructive - you can always restore again if needed.

Returns:
- New version number
- Which fields were changed
- Confirmation message`,
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'The note ID to restore',
        },
        targetVersion: {
          type: 'number',
          description: 'Version number to restore to',
        },
      },
      required: ['noteId', 'targetVersion'],
    },
  },
];

// Configuration from environment or command line
const getConfig = (): ApiConfig => {
  // Check command line args
  const urlArg = process.argv.find(arg => arg.startsWith('--api-url='));
  const keyArg = process.argv.find(arg => arg.startsWith('--api-key='));

  const baseUrl = urlArg
    ? urlArg.split('=').slice(1).join('=')
    : process.env.SECOND_BRAIN_API_URL || 'http://localhost:5001/api';

  const apiKey = keyArg
    ? keyArg.split('=').slice(1).join('=')
    : process.env.SECOND_BRAIN_API_KEY || '';

  if (!apiKey) {
    console.error('Warning: No API key provided. Set SECOND_BRAIN_API_KEY or use --api-key=');
  }

  return { baseUrl, apiKey };
};

const config = getConfig();
const apiClient = new ApiClient(config);

// Create MCP server
const server = new Server(
  {
    name: 'second-brain-notes',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: object;

    switch (name) {
      case 'create_note':
        result = await handleCreateNote(apiClient, args ?? {});
        break;
      case 'get_note':
        result = await handleGetNote(apiClient, args ?? {});
        break;
      case 'update_note':
        result = await handleUpdateNote(apiClient, args ?? {});
        break;
      case 'delete_note':
        result = await handleDeleteNote(apiClient, args ?? {});
        break;
      case 'list_notes':
        result = await handleListNotes(apiClient, args ?? {});
        break;
      case 'search_notes':
        result = await handleSearchNotes(apiClient, args ?? {});
        break;
      case 'get_note_versions':
        result = await handleGetVersions(apiClient, args ?? {});
        break;
      case 'restore_note_version':
        result = await handleRestoreVersion(apiClient, args ?? {});
        break;
      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`,
                hint: `Available tools: ${tools.map(t => t.name).join(', ')}`,
              }),
            },
          ],
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            code: 'INTERNAL_ERROR',
          }),
        },
      ],
    };
  }
});

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Second Brain Notes MCP Server running on stdio');
  console.error(`API URL: ${config.baseUrl}`);
  console.error(`API Key: ${config.apiKey ? '***configured***' : 'NOT SET'}`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
