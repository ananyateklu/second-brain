/**
 * Notes Service
 * Handles notes business logic and API calls
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS, NOTES_FOLDERS } from '../lib/constants';
import type { PaginatedResult } from '../types/api';
import type {
  Note,
  NoteListItem,
  NoteResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  ImportNoteRequest,
  ImportNotesResponse,
  NoteVersionHistory,
  NoteVersion,
  NoteVersionDiff,
  RestoreVersionResponse,
  GenerateSummariesRequest,
  GenerateSummariesResponse,
  SummaryJobResponse,
} from '../types/notes';

/**
 * Parameters for paginated notes request
 */
export interface GetNotesPagedParams {
  page?: number;
  pageSize?: number;
  folder?: string | null;
  includeArchived?: boolean;
  search?: string;
}

/**
 * Notes service for CRUD operations and business logic
 */
export const notesService = {
  /**
   * Get all notes (lightweight list response with summaries instead of full content)
   */
  async getAll(): Promise<NoteListItem[]> {
    return apiClient.get<NoteListItem[]>(API_ENDPOINTS.NOTES.BASE);
  },

  /**
   * Get paginated notes with server-side filtering
   * @param params - Pagination and filter parameters
   * @returns Paginated result with notes and metadata
   */
  async getPaged(params: GetNotesPagedParams = {}): Promise<PaginatedResult<NoteListItem>> {
    const { page = 1, pageSize = 20, folder, includeArchived = false, search } = params;

    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));
    queryParams.set('includeArchived', String(includeArchived));

    // Handle folder filter - empty string means "unfiled", null/undefined means "all folders"
    if (folder !== undefined && folder !== null) {
      queryParams.set('folder', folder);
    }
    if (search?.trim()) {
      queryParams.set('search', search.trim());
    }

    return apiClient.get<PaginatedResult<NoteListItem>>(
      `${API_ENDPOINTS.NOTES.PAGED}?${queryParams.toString()}`
    );
  },

  /**
   * Get a note by ID
   */
  async getById(id: string): Promise<NoteResponse> {
    return apiClient.get<NoteResponse>(API_ENDPOINTS.NOTES.BY_ID(id));
  },

  /**
   * Create a new note
   */
  async create(input: CreateNoteRequest): Promise<NoteResponse> {
    const validated = this.validateNote(input);
    if (!validated.valid) {
      throw new Error(validated.errors.join(', '));
    }
    return apiClient.post<NoteResponse>(API_ENDPOINTS.NOTES.BASE, input);
  },

  /**
   * Update an existing note
   */
  async update(id: string, input: UpdateNoteRequest): Promise<NoteResponse> {
    return apiClient.put<NoteResponse>(API_ENDPOINTS.NOTES.BY_ID(id), input);
  },

  /**
   * Delete a note
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<undefined>(API_ENDPOINTS.NOTES.BY_ID(id));
  },

  /**
   * Bulk delete multiple notes in a single request
   */
  async bulkDelete(noteIds: string[]): Promise<{ deletedCount: number; message: string }> {
    return apiClient.post<{ deletedCount: number; message: string }>(
      API_ENDPOINTS.NOTES.BULK_DELETE,
      { noteIds }
    );
  },

  /**
   * The folder name used for archived notes
   */
  ARCHIVED_FOLDER: NOTES_FOLDERS.ARCHIVED,

  /**
   * Archive a note (moves to Archived folder)
   */
  async archive(id: string): Promise<NoteResponse> {
    return this.update(id, { isArchived: true, folder: NOTES_FOLDERS.ARCHIVED, updateFolder: true });
  },

  /**
   * Unarchive a note (backend automatically removes from Archived folder if applicable)
   */
  async unarchive(id: string): Promise<NoteResponse> {
    // Don't send updateFolder - let the backend automatically remove from Archived folder
    // only if the note was in the Archived folder
    return this.update(id, { isArchived: false });
  },

  /**
   * Import notes in bulk
   */
  async import(notes: ImportNoteRequest[]): Promise<ImportNotesResponse> {
    return apiClient.post<ImportNotesResponse>(API_ENDPOINTS.NOTES.IMPORT, { notes });
  },

  /**
   * Validate note input
   */
  validateNote(input: Partial<CreateNoteRequest>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.title?.trim()) {
      errors.push('Title is required');
    } else if (input.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    if (input.content && input.content.length > 100000) {
      errors.push('Content must be less than 100,000 characters');
    }

    if (input.tags && input.tags.length > 20) {
      errors.push('Maximum 20 tags allowed');
    }

    if (input.tags) {
      for (const tag of input.tags) {
        if (tag.length > 50) {
          errors.push('Each tag must be less than 50 characters');
          break;
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Search notes by query
   * Works with both Note (full content) and NoteListItem (summary only)
   */
  searchNotes<T extends NoteListItem>(
    notes: T[],
    query: string,
    mode: 'title' | 'content' | 'both' = 'both'
  ): T[] {
    if (!query.trim()) return notes;

    const lowerQuery = query.toLowerCase();

    return notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      // For NoteListItem, search in summary; for Note, search in content
      const textToSearch = 'content' in note
        ? (note as Note).content
        : (note.summary || '');
      const contentMatch = textToSearch.toLowerCase().includes(lowerQuery);

      switch (mode) {
        case 'title':
          return titleMatch;
        case 'content':
          return contentMatch;
        default:
          return titleMatch || contentMatch;
      }
    });
  },

  /**
   * Filter notes by tags
   * Works with both Note and NoteListItem
   */
  filterByTags<T extends NoteListItem>(notes: T[], tags: string[]): T[] {
    if (tags.length === 0) return notes;
    return notes.filter((note) =>
      tags.some((tag) => note.tags.includes(tag))
    );
  },

  /**
   * Sort notes
   * Works with both Note and NoteListItem
   */
  sortNotes<T extends NoteListItem>(
    notes: T[],
    sortBy: 'newest' | 'oldest' | 'title-asc' | 'title-desc'
  ): T[] {
    const sorted = [...notes];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return sorted;
  },

  /**
   * Get all unique tags from notes
   * Works with both Note and NoteListItem
   */
  getAllTags<T extends NoteListItem>(notes: T[]): string[] {
    const tagSet = new Set<string>();
    for (const note of notes) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },

  /**
   * Get tag counts
   * Works with both Note and NoteListItem
   */
  getTagCounts<T extends NoteListItem>(notes: T[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      for (const tag of note.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return counts;
  },

  /**
   * Create an optimistic note for UI updates
   */
  createOptimisticNote(input: CreateNoteRequest): Note {
    // Exclude images from spread - they will be populated from server response
    const { images: _images, ...noteFields } = input;
    return {
      id: `temp-${Date.now()}`,
      ...noteFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [], // Will be populated from server response
    };
  },

  /**
   * Apply optimistic update to note
   */
  applyOptimisticUpdate(note: Note, update: UpdateNoteRequest): Note {
    // Exclude images and deletedImageIds from spread - they will be populated from server response
    const { images: _images, deletedImageIds: _deletedImageIds, ...updateFields } = update;
    return {
      ...note,
      ...updateFields,
      updatedAt: new Date().toISOString(),
    };
  },

  // ============================================
  // Note Version History (PostgreSQL 18 Temporal Features)
  // ============================================

  /**
   * Get version history for a note
   * Returns all versions with metadata about each version
   */
  async getVersionHistory(noteId: string): Promise<NoteVersionHistory> {
    return apiClient.get<NoteVersionHistory>(API_ENDPOINTS.NOTES.VERSIONS(noteId));
  },

  /**
   * Get the state of a note at a specific point in time
   * @param noteId - The note ID
   * @param timestamp - ISO timestamp to retrieve version at
   */
  async getVersionAtTime(noteId: string, timestamp: string): Promise<NoteVersion> {
    const url = `${API_ENDPOINTS.NOTES.VERSION_AT(noteId)}?timestamp=${encodeURIComponent(timestamp)}`;
    return apiClient.get<NoteVersion>(url);
  },

  /**
   * Compare two versions of a note
   * @param noteId - The note ID
   * @param fromVersion - Earlier version number
   * @param toVersion - Later version number
   */
  async getVersionDiff(
    noteId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<NoteVersionDiff> {
    const url = `${API_ENDPOINTS.NOTES.VERSION_DIFF(noteId)}?fromVersion=${fromVersion}&toVersion=${toVersion}`;
    return apiClient.get<NoteVersionDiff>(url);
  },

  /**
   * Restore a note to a previous version
   * Creates a new version with the content from the target version
   * @param noteId - The note ID
   * @param targetVersion - Version number to restore to
   */
  async restoreVersion(noteId: string, targetVersion: number): Promise<RestoreVersionResponse> {
    return apiClient.post<RestoreVersionResponse>(
      API_ENDPOINTS.NOTES.RESTORE_VERSION(noteId),
      { targetVersion }
    );
  },

  // ============================================
  // Note Summary Generation
  // ============================================

  /**
   * Generate AI summaries for notes (synchronous, blocking)
   * @param noteIds - Optional list of note IDs. If empty, generates for all notes without summaries.
   * @deprecated Use startSummaryGeneration for non-blocking background processing
   */
  async generateSummaries(noteIds: string[] = []): Promise<GenerateSummariesResponse> {
    return apiClient.post<GenerateSummariesResponse>(
      API_ENDPOINTS.NOTES.GENERATE_SUMMARIES,
      { noteIds } as GenerateSummariesRequest
    );
  },

  // ============================================
  // Background Summary Generation Jobs
  // ============================================

  /**
   * Start a background summary generation job
   * @param noteIds - Optional list of note IDs. If empty, generates for all notes without summaries.
   * @returns The created summary job with ID for polling
   */
  async startSummaryGeneration(noteIds: string[] = []): Promise<SummaryJobResponse> {
    return apiClient.post<SummaryJobResponse>(
      API_ENDPOINTS.NOTES.SUMMARIES_START,
      { noteIds } as GenerateSummariesRequest
    );
  },

  /**
   * Get the status of a summary generation job
   * @param jobId - The job ID to check
   */
  async getSummaryJobStatus(jobId: string): Promise<SummaryJobResponse> {
    return apiClient.get<SummaryJobResponse>(API_ENDPOINTS.NOTES.SUMMARIES_STATUS(jobId));
  },

  /**
   * Cancel an active summary generation job
   * @param jobId - The job ID to cancel
   */
  async cancelSummaryJob(jobId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(API_ENDPOINTS.NOTES.SUMMARIES_CANCEL(jobId));
  },
};

