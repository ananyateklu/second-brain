import api from './api';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  archivedAt?: string;
  linkedNoteIds: string[];
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
    
    console.log('Create note response:', response.data);
    
    return {
      ...response.data,
      tags: Array.isArray(response.data.tags) ? response.data.tags : 
            typeof response.data.tags === 'string' ? response.data.tags.split(',').filter(Boolean) : [],
      linkedNoteIds: response.data.linkedNoteIds || []
    };
  },

  async getAllNotes(): Promise<Note[]> {
    console.log('Making API call to fetch notes');
    const response = await api.get<Note[]>('/api/Notes');
    console.log('API response for notes:', response.data);
    return response.data
      .filter(note => !note.isDeleted)
      .map(note => ({
        ...note,
        tags: Array.isArray(note.tags) ? note.tags : [],
        linkedNoteIds: Array.isArray(note.linkedNoteIds) ? note.linkedNoteIds : [],
        linkedNotes: Array.isArray(note.linkedNotes) ? note.linkedNotes : []
      }));
  },

  async updateNote(id: string, data: Partial<UpdateNoteData>): Promise<Note> {
    const response = await api.put<Note>(`/api/Notes/${id}`, {
        ...data,
        ...(data.isDeleted && { deletedAt: new Date().toISOString() })
    });
    return {
        ...response.data,
        tags: Array.isArray(response.data.tags) ? response.data.tags : [],
        linkedNoteIds: Array.isArray(response.data.linkedNoteIds) ? response.data.linkedNoteIds : [],
        linkedNotes: Array.isArray(response.data.linkedNotes) ? response.data.linkedNotes : []
    };
  },

  async deleteNote(id: string): Promise<Note> {
    return await this.updateNote(id, {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
  },

  async addLink(sourceId: string, targetId: string): Promise<Note> {
    const response = await api.post<Note>(`/api/Notes/${sourceId}/links`, { targetNoteId: targetId });
    return {
      ...response.data,
      tags: Array.isArray(response.data.tags) ? response.data.tags : [],
      linkedNoteIds: Array.isArray(response.data.linkedNoteIds) ? response.data.linkedNoteIds : [],
      linkedNotes: Array.isArray(response.data.linkedNoteIds) ? response.data.linkedNoteIds : []
    };
  },

  async removeLink(sourceId: string, targetId: string): Promise<void> {
    if (!sourceId || !targetId) {
      throw new Error('Both sourceId and targetId are required to remove a link');
    }
    
    console.log('Making DELETE request to:', `/api/Notes/${sourceId}/links/${targetId}`);
    
    try {
      await api.delete(`/api/Notes/${sourceId}/links/${targetId}`);
    } catch (error) {
      console.error('Error removing link:', error);
      throw error;
    }
  },

  async getArchivedNotes(): Promise<Note[]> {
    try {
        console.log('Fetching archived notes...');
        const response = await api.get<Note[]>('/api/Notes/archived');
        console.log('Archived notes response:', response.data);
        
        return response.data.map(note => ({
            ...note,
            tags: Array.isArray(note.tags) ? note.tags : [],
            linkedNoteIds: Array.isArray(note.linkedNoteIds) ? note.linkedNoteIds : [],
            linkedNotes: Array.isArray(note.linkedNoteIds) ? note.linkedNoteIds : []
        }));
    } catch (error) {
        console.error('Error fetching archived notes:', error);
        throw error;
    }
  },

  async restoreNote(id: string): Promise<Note> {
    const response = await api.post<Note>(`/api/Notes/${id}/restore`);
    return response.data;
  },

  async getDeletedNotes(): Promise<Note[]> {
    const response = await api.get<Note[]>('/api/Notes/deleted');
    return response.data.map(note => ({
      ...note,
      tags: Array.isArray(note.tags) ? note.tags : [],
      linkedNoteIds: Array.isArray(note.linkedNoteIds) ? note.linkedNoteIds : [],
      linkedNotes: Array.isArray(note.linkedNotes) ? note.linkedNotes : []
    }));
  },

  async deleteNotePermanently(id: string): Promise<void> {
    await api.delete(`/api/Notes/${id}/permanent`);
  },

  async unarchiveNote(id: string): Promise<Note> {
    try {
        const response = await api.post<Note>(`/api/Notes/${id}/unarchive`);
        return {
            ...response.data,
            tags: Array.isArray(response.data.tags) ? response.data.tags : [],
            linkedNoteIds: Array.isArray(response.data.linkedNoteIds) ? response.data.linkedNoteIds : [],
            linkedNotes: Array.isArray(response.data.linkedNotes) ? response.data.linkedNotes : []
        };
    } catch (error) {
        console.error('Error unarchiving note:', error);
        throw error;
    }
  }
};