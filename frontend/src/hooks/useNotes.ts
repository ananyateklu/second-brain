import { useContext } from 'react';
import { NotesContext } from '../contexts/NotesContext';
import type { Note } from '../types/note';

interface NotesContextType {
  getNote: (id: string) => Note | null;
  // ... other methods from NotesContext
}

export function useNotes(): NotesContextType {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
} 