import { apiClient } from '../../../lib/api-client';
import { Note, CreateNoteInput, UpdateNoteInput } from '../types/note';

export const notesApi = {
  async getAll(): Promise<Note[]> {
    return apiClient.get<Note[]>('/notes');
  },

  async getById(id: string): Promise<Note> {
    return apiClient.get<Note>(`/notes/${id}`);
  },

  async create(note: CreateNoteInput): Promise<Note> {
    return apiClient.post<Note>('/notes', note);
  },

  async update(id: string, note: UpdateNoteInput): Promise<Note> {
    return apiClient.put<Note>(`/notes/${id}`, note);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/notes/${id}`);
  },
};
