import api from './api';
import { Note, LinkedTask } from '../../types/note';

// API response types
interface NoteResponse {
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

const processNoteResponse = (note: NoteResponse): Note => {
  console.log('Processing note response:', note);
  
  const processedNote = {
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : note.tags?.split(',').filter(Boolean) || [],
    linkedNoteIds: Array.isArray(note.linkedNoteIds) ? note.linkedNoteIds : [],
    linkedNotes: Array.isArray(note.linkedNotes) ? note.linkedNotes : [],
    linkedTasks: Array.isArray(note.linkedTasks) ? note.linkedTasks.map((task): LinkedTask => {
      console.log('Processing task:', task);
      return {
        ...task,
        status: processTaskStatus(task.status),
        priority: processTaskPriority(task.priority)
      };
    }) : []
  };
  
  console.log('Processed note:', processedNote);
  return processedNote;
};

export const notesService = {
  async createNote(data: CreateNoteData): Promise<Note> {
    const safeData = {
      ...data,
      tags: data.tags || [],
    };
    
    const response = await api.post<NoteResponse>('/api/Notes', safeData);
    console.log('Create note response:', response.data); // Debug log
    return processNoteResponse(response.data);
  },

  async getAllNotes(): Promise<Note[]> {
    const response = await api.get<NoteResponse[]>('/api/Notes');
    console.log('API response for getAllNotes:', response.data);
    
    const processedNotes = response.data
      .filter(note => !note.isDeleted)
      .map(processNoteResponse);
    
    console.log('Processed all notes:', processedNotes);
    return processedNotes;
  },

  async updateNote(id: string, data: Partial<UpdateNoteData>): Promise<Note> {
    const response = await api.put<Note>(`/api/Notes/${id}`, {
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

  async addLink(sourceId: string, targetId: string): Promise<LinkResponse> {
    const response = await api.post<LinkResponse>(`/api/Notes/${sourceId}/links`, { targetNoteId: targetId });
    return response.data;
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
      const response = await api.get<Note[]>('/api/Notes/archived');
      
      return response.data.map(processNoteResponse);
    } catch (error) {
      console.error('Error fetching archived notes:', error);
      throw error;
    }
  },

  async restoreNote(id: string): Promise<Note> {
    const response = await api.post<Note>(`/api/Notes/${id}/restore`);
    return processNoteResponse(response.data);
  },

  async getDeletedNotes(): Promise<Note[]> {
    const response = await api.get<Note[]>('/api/Notes/deleted');
    return response.data.map(processNoteResponse);
  },

  async deleteNotePermanently(id: string): Promise<void> {
    await api.delete(`/api/Notes/${id}/permanent`);
  },

  async unarchiveNote(id: string): Promise<Note> {
    try {
        const response = await api.post<Note>(`/api/Notes/${id}/unarchive`);
        return processNoteResponse(response.data);
    } catch (error) {
        console.error('Error unarchiving note:', error);
        throw error;
    }
  }
};