import api from './api';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  linkedNotes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  archivedAt?: string | null;
}

export const notesService = {
  async createNote(data: CreateNoteData): Promise<Note> {
    const safeData = {
      ...data,
      tags: data.tags || [],
    };
    
    const response = await api.post<Note>('/api/Notes', safeData);
    
    return {
      ...response.data,
      tags: Array.isArray(response.data.tags) ? response.data.tags : [],
    };
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
  },

  async addLink(sourceId: string, targetId: string): Promise<void> {
    await api.post(`/api/Notes/${sourceId}/links`, { targetNoteId: targetId });
  },

  async removeLink(sourceId: string, targetId: string): Promise<void> {
    await api.delete(`/api/Notes/${sourceId}/links/${targetId}`);
  }
};