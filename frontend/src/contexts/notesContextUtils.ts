import { createContext, useContext } from 'react';
import type { Note } from '../types/note';

export interface NotesContextType {
  notes: Note[];
  archivedNotes: Note[];
  isLoading: boolean;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks' | 'linkedReminders'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  togglePinNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => Promise<Note>;
  addLink: (sourceId: string, targetId: string) => void;
  removeLink: (sourceId: string, targetId: string) => void;
  linkReminder: (noteId: string, reminderId: string) => Promise<Note>;
  unlinkReminder: (noteId: string, reminderId: string) => Promise<Note>;
  loadArchivedNotes: (force?: boolean) => Promise<void>;
  clearArchivedNotes: () => void;
  restoreMultipleNotes: (ids: string[]) => Promise<PromiseSettledResult<Note>[]>;
  restoreNote: (restoredNote: Note) => Promise<void>;
  fetchNotes: () => Promise<void>;
  addReminderToNote: (noteId: string, reminderId: string) => Promise<void>;
  removeReminderFromNote: (noteId: string, reminderId: string) => Promise<void>;
}

export const NotesContext = createContext<NotesContextType | null>(null);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}; 