import type { ApiClient } from '../api-client.js';

export async function handleListNotes(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { folder, includeArchived, search, page, pageSize } = args;

  const params: Parameters<ApiClient['listNotes']>[0] = {};

  if (typeof folder === 'string') params.folder = folder;
  if (includeArchived === true) params.includeArchived = true;
  if (typeof search === 'string' && search.trim()) params.search = search.trim();
  if (typeof page === 'number' && page > 0) params.page = page;
  if (typeof pageSize === 'number' && pageSize > 0) {
    params.pageSize = Math.min(pageSize, 100); // Cap at 100
  }

  const result = await client.listNotes(params);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 401 ? 'UNAUTHORIZED' : 'API_ERROR',
    };
  }

  const { items, totalCount, page: currentPage, pageSize: size, totalPages, hasNextPage } = result.data;

  return {
    success: true,
    data: {
      notes: items.map(note => ({
        id: note.id,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        folder: note.folder,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
      pagination: {
        page: currentPage,
        pageSize: size,
        totalCount,
        totalPages,
        hasNextPage,
      },
      hint: items.length > 0
        ? 'Use get_note with an ID to retrieve full content'
        : 'No notes found matching the criteria',
    },
  };
}

export async function handleSearchNotes(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { query, maxResults } = args;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      success: false,
      error: 'Search query is required',
      code: 'VALIDATION_ERROR',
    };
  }

  // Use the paged endpoint with search parameter
  const params = {
    search: query.trim(),
    pageSize: typeof maxResults === 'number' ? Math.min(maxResults, 20) : 5,
  };

  const result = await client.listNotes(params);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 401 ? 'UNAUTHORIZED' : 'API_ERROR',
    };
  }

  return {
    success: true,
    data: {
      searchQuery: query,
      notes: result.data.items.map(note => ({
        id: note.id,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        folder: note.folder,
        updatedAt: note.updatedAt,
      })),
      totalFound: result.data.totalCount,
      hint: result.data.items.length > 0
        ? 'Use get_note with an ID to retrieve full content'
        : 'No notes found. Try different search terms or use list_notes to browse.',
    },
  };
}
