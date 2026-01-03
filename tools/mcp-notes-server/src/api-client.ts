import type {
  ApiConfig,
  ApiResult,
  Note,
  NoteListItem,
  PaginatedResult,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteVersionHistory,
  RestoreVersionResponse,
} from './types.js';

export class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResult<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.config.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status,
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // CRUD Operations
  async createNote(request: CreateNoteRequest): Promise<ApiResult<Note>> {
    return this.request<Note>('POST', '/notes', request);
  }

  async getNote(id: string): Promise<ApiResult<Note>> {
    return this.request<Note>('GET', `/notes/${id}`);
  }

  async updateNote(id: string, request: UpdateNoteRequest): Promise<ApiResult<Note>> {
    return this.request<Note>('PUT', `/notes/${id}`, request);
  }

  async deleteNote(id: string): Promise<ApiResult<void>> {
    return this.request<void>('DELETE', `/notes/${id}`);
  }

  // List Operations
  async listNotes(params: {
    page?: number;
    pageSize?: number;
    folder?: string;
    includeArchived?: boolean;
    search?: string;
  } = {}): Promise<ApiResult<PaginatedResult<NoteListItem>>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.folder !== undefined) queryParams.set('folder', params.folder);
    if (params.includeArchived) queryParams.set('includeArchived', 'true');
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.request<PaginatedResult<NoteListItem>>(
      'GET',
      `/notes/paged${query ? `?${query}` : ''}`
    );
  }

  async getAllNotes(): Promise<ApiResult<NoteListItem[]>> {
    return this.request<NoteListItem[]>('GET', '/notes');
  }

  // Version History
  async getVersionHistory(
    noteId: string,
    skip = 0,
    take = 50
  ): Promise<ApiResult<NoteVersionHistory>> {
    return this.request<NoteVersionHistory>(
      'GET',
      `/notes/${noteId}/versions?skip=${skip}&take=${take}`
    );
  }

  async restoreVersion(
    noteId: string,
    targetVersion: number
  ): Promise<ApiResult<RestoreVersionResponse>> {
    return this.request<RestoreVersionResponse>(
      'POST',
      `/notes/${noteId}/versions/restore`,
      { targetVersion }
    );
  }
}
