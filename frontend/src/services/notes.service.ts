/**
 * Notes Service
 * Handles notes business logic and API calls
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/constants';
import type {
  Note,
  NoteResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  ImportNoteRequest,
  ImportNotesResponse,
} from '../types/notes';

/**
 * Notes service for CRUD operations and business logic
 */
export const notesService = {
  /**
   * Get all notes
   */
  async getAll(): Promise<NoteResponse[]> {
    return apiClient.get<NoteResponse[]>(API_ENDPOINTS.NOTES.BASE);
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
    return apiClient.delete<void>(API_ENDPOINTS.NOTES.BY_ID(id));
  },

  /**
   * Archive a note
   */
  async archive(id: string): Promise<NoteResponse> {
    return this.update(id, { isArchived: true });
  },

  /**
   * Unarchive a note
   */
  async unarchive(id: string): Promise<NoteResponse> {
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
   */
  searchNotes(
    notes: Note[],
    query: string,
    mode: 'title' | 'content' | 'both' = 'both'
  ): Note[] {
    if (!query.trim()) return notes;
    
    const lowerQuery = query.toLowerCase();
    
    return notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = note.content.toLowerCase().includes(lowerQuery);
      
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
   */
  filterByTags(notes: Note[], tags: string[]): Note[] {
    if (tags.length === 0) return notes;
    return notes.filter((note) =>
      tags.some((tag) => note.tags.includes(tag))
    );
  },

  /**
   * Sort notes
   */
  sortNotes(
    notes: Note[],
    sortBy: 'newest' | 'oldest' | 'title-asc' | 'title-desc'
  ): Note[] {
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
   */
  getAllTags(notes: Note[]): string[] {
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
   */
  getTagCounts(notes: Note[]): Record<string, number> {
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
    return {
      id: `temp-${Date.now()}`,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Apply optimistic update to note
   */
  applyOptimisticUpdate(note: Note, update: UpdateNoteRequest): Note {
    return {
      ...note,
      ...update,
      updatedAt: new Date().toISOString(),
    };
  },
};

