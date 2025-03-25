import api from './api';
import { Note, LinkedTask, NoteLink } from '../../types/note';

// API response types
export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  tags: string[] | string;
  isFavorite: boolean;
  isPinned: boolean;
  isIdea: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds: string[];
  linkedNotes?: Note[];
  archivedAt?: string;
  linkedTasks?: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  linkedReminders?: Array<{
    id: string;
    title: string;
    description: string;
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  links?: NoteLink[];
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

const processTaskStatus = (status: string): LinkedTask['status'] => {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus === 'completed' ? 'completed' : 'incomplete';
};

const processTaskPriority = (priority: string): LinkedTask['priority'] => {
  const normalizedPriority = priority.toLowerCase();
  switch (normalizedPriority) {
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
};

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
  isIdea: note.isIdea || false,
  linkedNoteIds: note.linkedNoteIds || [],
  links: note.links || [],
  linkedTasks: note.linkedTasks?.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: processTaskStatus(task.status),
    priority: processTaskPriority(task.priority),
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt
  })) || [],
  linkedReminders: note.linkedReminders || []
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

  async addLink(sourceId: string, targetId: string, linkType: string = 'default'): Promise<LinkResponse> {
    const response = await api.post<LinkResponse>(`/api/Notes/${sourceId}/links`, {
      targetNoteId: targetId,
      linkType: linkType
    });
    return response.data;
  },

  async removeLink(sourceId: string, targetId: string): Promise<{ sourceNote: Note; targetNote: Note }> {
    if (!sourceId || !targetId) {
      throw new Error('Both sourceId and targetId are required to remove a link');
    }

    try {
      await api.delete(`/api/Notes/${sourceId}/links/${targetId}`);

      // Fetch fresh data for both notes after unlinking
      const [sourceResponse, targetResponse] = await Promise.all([
        api.get<NoteResponse>(`/api/Notes/${sourceId}`),
        api.get<NoteResponse>(`/api/Notes/${targetId}`)
      ]);

      return {
        sourceNote: processNoteResponse(sourceResponse.data),
        targetNote: processNoteResponse(targetResponse.data)
      };
    } catch (error) {
      console.error('Error removing link:', error);
      throw error;
    }
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
    const response = await api.delete<Note>(`/api/Notes/${noteId}/reminders/${reminderId}`);
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
    const response = await api.post<Note>(`/api/Notes/${noteId}/reminders`, { reminderId });
    return response.data;
  },

  async removeReminderFromNote(noteId: string, reminderId: string): Promise<Note> {
    const response = await api.delete<Note>(`/api/Notes/${noteId}/reminders/${reminderId}`);
    return response.data;
  },

  async triggerUserStatsUpdate(): Promise<void> {
    try {
      await api.post('/api/Users/trigger-stats-update');
    } catch (error) {
      console.error('[Notes] Error triggering user stats update:', error);
      throw error;
    }
  }
};