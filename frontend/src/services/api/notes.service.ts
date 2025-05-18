import api from './api';
import { Note } from '../../types/note';

// API response types
export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  tags: string[] | string;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  linkedItems: Array<{
    id: string;
    type: string;
    title: string;
    linkType?: string;
  }>;
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface LinkResponse {
  sourceNote: Note;
  targetNote: Note;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  archivedAt?: string;
  linkedNoteIds?: string[];
}

// For linking, the backend NoteLinkRequest expects LinkedItemId and LinkedItemType
export interface AddNoteLinkData {
  linkedItemId: string;
  linkedItemType: 'Note' | 'Idea' | 'Task' | 'Reminder';
  linkType?: string;
}

const processNoteResponse = (note: NoteResponse): Note => ({
  id: note.id,
  title: note.title,
  content: note.content,
  tags: Array.isArray(note.tags) ? note.tags : [],
  isFavorite: note.isFavorite,
  isPinned: note.isPinned,
  isArchived: note.isArchived,
  isDeleted: note.isDeleted,
  deletedAt: note.deletedAt,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  archivedAt: note.archivedAt,
  linkedItems: (note.linkedItems || []).map(item => ({
    id: item.id,
    title: item.title,
    type: item.type as 'Note' | 'Idea' | 'Task' | 'Reminder',
    linkType: item.linkType
  })),
});

export const notesService = {
  async createNote(data: CreateNoteData): Promise<Note> {
    const safeData = {
      ...data,
      tags: data.tags || [],
    };

    const response = await api.post<NoteResponse>('/api/Notes', safeData);
    return processNoteResponse(response.data);
  },

  async getAllNotes(): Promise<Note[]> {
    const response = await api.get<NoteResponse[]>('/api/Notes');
    return response.data
      .filter(note => !note.isDeleted)
      .map(processNoteResponse);
  },

  async getNoteById(id: string): Promise<Note> {
    const response = await api.get<NoteResponse>(`/api/Notes/${id}`);
    return processNoteResponse(response.data);
  },

  async updateNote(id: string, data: Partial<UpdateNoteData>): Promise<Note> {
    const response = await api.put<NoteResponse>(`/api/Notes/${id}`, {
      ...data,
      ...(data.isDeleted && { deletedAt: new Date().toISOString() })
    });
    return processNoteResponse(response.data);
  },

  async deleteNote(id: string): Promise<Note> {
    return await this.updateNote(id, {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
  },

  async addLink(noteId: string, data: AddNoteLinkData): Promise<Note> {
    const response = await api.post<NoteResponse>(`/api/Notes/${noteId}/links`, data);
    return processNoteResponse(response.data);
  },

  async removeLink(noteId: string, linkedItemId: string, linkedItemType: string): Promise<Note> {
    if (!noteId || !linkedItemId || !linkedItemType) {
      throw new Error('noteId, linkedItemId, and linkedItemType are required to remove a link');
    }
    const response = await api.delete<NoteResponse>(`/api/Notes/${noteId}/links/${linkedItemType}/${linkedItemId}`);
    return processNoteResponse(response.data);
  },

  async linkReminder(noteId: string, reminderId: string): Promise<Note> {
    try {
      const response = await api.post<NoteResponse>(`/api/Notes/${noteId}/reminders`, {
        reminderId: reminderId
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      return processNoteResponse(response.data);
    } catch (error) {
      console.error('API error in linkReminder:', error);
      throw error;
    }
  },

  async unlinkReminder(noteId: string, reminderId: string): Promise<Note> {
    const response = await api.delete<NoteResponse>(`/api/Notes/${noteId}/reminders/${reminderId}`);
    return processNoteResponse(response.data);
  },

  async getArchivedNotes(): Promise<Note[]> {
    try {
      const response = await api.get<NoteResponse[]>('/api/Notes/archived');
      return response.data.map(processNoteResponse);
    } catch (error) {
      console.error('Error fetching archived notes:', error);
      throw error;
    }
  },

  async restoreNote(id: string): Promise<Note> {
    const response = await api.post<NoteResponse>(`/api/Notes/${id}/restore`);
    return processNoteResponse(response.data);
  },

  async getDeletedNotes(): Promise<Note[]> {
    const response = await api.get<NoteResponse[]>('/api/Notes/deleted');
    return response.data.map(processNoteResponse);
  },

  async deleteNotePermanently(id: string): Promise<void> {
    await api.delete(`/api/Notes/${id}/permanent`);
  },

  async unarchiveNote(id: string): Promise<Note> {
    try {
      const response = await api.post<NoteResponse>(`/api/Notes/${id}/unarchive`);
      return processNoteResponse(response.data);
    } catch (error) {
      console.error('Error unarchiving note:', error);
      throw error;
    }
  },

  async addReminderToNote(noteId: string, reminderId: string): Promise<Note> {
    const response = await api.post<NoteResponse>(`/api/Notes/${noteId}/reminders`, { reminderId });
    return processNoteResponse(response.data);
  },

  async removeReminderFromNote(noteId: string, reminderId: string): Promise<Note> {
    const response = await api.delete<NoteResponse>(`/api/Notes/${noteId}/reminders/${reminderId}`);
    return processNoteResponse(response.data);
  },

  async triggerUserStatsUpdate(): Promise<void> {
    try {
      await api.post('/api/Users/trigger-stats-update');
    } catch (error) {
      console.error('[Notes] Error triggering user stats update:', error);
      throw error;
    }
  },

  async duplicateNote(noteId: string): Promise<Note> {
    try {
      // Get the note to duplicate
      const response = await api.get<NoteResponse>(`/api/Notes/${noteId}`);
      const originalNote = response.data;

      // Create the tags array
      const tags = Array.isArray(originalNote.tags) ? [...originalNote.tags] : [];

      // Create a new note with the same content but new ID
      const newNoteData: CreateNoteData = {
        title: `${originalNote.title} (copy)`,
        content: originalNote.content,
        tags: tags,
        isPinned: originalNote.isPinned,
        isFavorite: originalNote.isFavorite
      };

      // Create the duplicate
      const duplicateResponse = await api.post<NoteResponse>('/api/Notes', newNoteData);
      return processNoteResponse(duplicateResponse.data);
    } catch (error) {
      console.error('Failed to duplicate note:', error);
      throw error;
    }
  },

  async duplicateNotes(noteIds: string[]): Promise<Note[]> {
    try {
      const duplicatedNotes: Note[] = [];

      for (const noteId of noteIds) {
        const duplicatedNote = await this.duplicateNote(noteId);
        duplicatedNotes.push(duplicatedNote);
      }

      return duplicatedNotes;
    } catch (error) {
      console.error('Failed to duplicate notes:', error);
      throw error;
    }
  },
};