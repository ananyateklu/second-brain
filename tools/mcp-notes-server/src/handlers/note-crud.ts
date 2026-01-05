import type { ApiClient } from '../api-client.js';
import type { CreateNoteRequest, UpdateNoteRequest } from '../types.js';

export async function handleCreateNote(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { title, content, tags, folder, isArchived } = args;

  // Validation
  if (!title || typeof title !== 'string') {
    return { success: false, error: 'Title is required', code: 'VALIDATION_ERROR' };
  }
  if (!content || typeof content !== 'string') {
    return { success: false, error: 'Content is required', code: 'VALIDATION_ERROR' };
  }
  if (title.length > 200) {
    return { success: false, error: 'Title must be less than 200 characters', code: 'VALIDATION_ERROR' };
  }

  const request: CreateNoteRequest = {
    title: title.trim(),
    content,
    tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : [],
    folder: typeof folder === 'string' ? folder : undefined,
    isArchived: typeof isArchived === 'boolean' ? isArchived : false,
    source: 'mcp',
    mcpServerName: 'second-brain-notes',
  };

  const result = await client.createNote(request);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 401 ? 'UNAUTHORIZED' : 'API_ERROR',
      hint: result.statusCode === 401
        ? 'Check your API key configuration (SECOND_BRAIN_API_KEY or --api-key)'
        : undefined,
    };
  }

  return {
    success: true,
    data: {
      message: `Note "${result.data.title}" created successfully`,
      note: {
        id: result.data.id,
        title: result.data.title,
        folder: result.data.folder,
        tags: result.data.tags,
        createdAt: result.data.createdAt,
      },
    },
  };
}

export async function handleGetNote(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { id } = args;

  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Note ID is required', code: 'VALIDATION_ERROR' };
  }

  const result = await client.getNote(id);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR',
      hint: result.statusCode === 404
        ? 'Use list_notes to find available notes'
        : undefined,
    };
  }

  return {
    success: true,
    data: {
      note: result.data,
    },
  };
}

export async function handleUpdateNote(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { id, title, content, tags, folder, updateFolder, isArchived } = args;

  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Note ID is required', code: 'VALIDATION_ERROR' };
  }

  const request: UpdateNoteRequest = {
    source: 'mcp',
    mcpServerName: 'second-brain-notes',
  };

  if (typeof title === 'string') request.title = title.trim();
  if (typeof content === 'string') request.content = content;
  if (Array.isArray(tags)) request.tags = tags.filter(t => typeof t === 'string');
  if (typeof isArchived === 'boolean') request.isArchived = isArchived;

  // Handle folder updates (need updateFolder flag to clear folder)
  if (updateFolder === true) {
    request.updateFolder = true;
    request.folder = typeof folder === 'string' ? folder : undefined;
  } else if (typeof folder === 'string') {
    request.folder = folder;
  }

  // Check if there's anything to update (excluding source metadata)
  const updateFields = Object.keys(request).filter(k => k !== 'source' && k !== 'mcpServerName');
  if (updateFields.length === 0) {
    return {
      success: false,
      error: 'No fields to update provided',
      code: 'VALIDATION_ERROR',
      hint: 'Provide at least one field to update: title, content, tags, folder, or isArchived',
    };
  }

  const result = await client.updateNote(id, request);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR',
    };
  }

  return {
    success: true,
    data: {
      message: `Note "${result.data.title}" updated successfully`,
      note: {
        id: result.data.id,
        title: result.data.title,
        folder: result.data.folder,
        tags: result.data.tags,
        updatedAt: result.data.updatedAt,
      },
    },
  };
}

export async function handleDeleteNote(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { id } = args;

  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Note ID is required', code: 'VALIDATION_ERROR' };
  }

  const result = await client.deleteNote(id);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR',
    };
  }

  return {
    success: true,
    data: {
      message: 'Note deleted successfully (soft delete - can be restored)',
      noteId: id,
    },
  };
}
