import api from './api';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
  reminderDate?: string;
}

export const notesService = {
  async createNote(data: CreateNoteData): Promise<Note> {
    const response = await api.post<Note>('/api/Notes', data);
    return response.data;
  },

  async getNoteById(id: string): Promise<Note> {
    const response = await api.get<Note>(`/api/Notes/${id}`);
    return response.data;
  },

  async getNotes(): Promise<Note[]> {
    const response = await api.get<Note[]>('/api/Notes');
    return response.data;
  },

  async updateNote(id: string, data: Partial<CreateNoteData>): Promise<Note> {
    const response = await api.put<Note>(`/api/Notes/${id}`, data);
    return response.data;
  },

  async deleteNote(id: string): Promise<void> {
    await api.delete(`/api/Notes/${id}`);
  }
};