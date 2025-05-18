import { createContext, useContext } from 'react';
import type { Note } from '../types/note';
import { TickTickTask } from '../types/integrations';
import { SyncConfig, SyncResult } from '../services/api/integrations.service';

export interface NotesContextType {
  notes: Note[];
  archivedNotes: Note[];
  isLoading: boolean;

  // TickTick specific state
  tickTickNotes: TickTickTask[];
  isTickTickLoading: boolean;
  tickTickError: string | null;
  fetchTickTickNotes: () => Promise<void>;
  isTickTickConnected: boolean;
  refreshTickTickConnection: (forceCheck?: boolean) => Promise<void>;
  tickTickProjectId: string;
  updateTickTickProjectId: (projectId: string) => Promise<void>;
  getTickTickNote: (projectId: string, noteId: string) => Promise<TickTickTask | null>;
  updateTickTickNote: (noteId: string, note: Partial<TickTickTask> & { id: string; projectId: string }) => Promise<TickTickTask | null>;
  deleteTickTickNote: (projectId: string, noteId: string) => Promise<boolean>;
  createTickTickNote: (projectId: string, noteData: Partial<TickTickTask>) => Promise<TickTickTask | null>;
  // Add TickTick sync methods
  syncWithTickTick: (config: SyncConfig) => Promise<SyncResult>;
  getSyncStatus: () => Promise<{ lastSynced: string | null; taskCount: { local: number; tickTick: number; mapped: number } }>;
  resetSyncData: () => Promise<boolean>;
  isSyncing: boolean;
  syncError: string | null;

  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks' | 'linkedReminders' | 'links'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  togglePinNote: (id: string) => Promise<void>;
  toggleFavoriteNote: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  unarchiveNote: (id: string) => Promise<Note>;
  addLink: (noteId: string, linkedItemId: string, linkedItemType: 'Note' | 'Idea' | 'Task' | 'Reminder', linkType?: string) => Promise<void>;
  removeLink: (noteId: string, linkedItemId: string, linkedItemType: string) => Promise<void>;
  linkReminder: (noteId: string, reminderId: string) => Promise<Note>;
  unlinkReminder: (noteId: string, reminderId: string) => Promise<Note>;
  loadArchivedNotes: (force?: boolean) => Promise<void>;
  clearArchivedNotes: () => void;
  restoreMultipleNotes: (ids: string[]) => Promise<PromiseSettledResult<Note>[]>;
  restoreNote: (restoredNote: Note) => Promise<void>;
  fetchNotes: () => Promise<void>;
  addReminderToNote: (noteId: string, reminderId: string) => Promise<Note>;
  removeReminderFromNote: (noteId: string, reminderId: string) => Promise<Note>;
  duplicateNote: (noteId: string) => Promise<Note>;
  duplicateNotes: (noteIds: string[]) => Promise<Note[]>;
}

export const NotesContext = createContext<NotesContextType | null>(null);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}; 