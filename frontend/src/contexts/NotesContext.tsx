import React, { createContext, useContext, useState, useCallback } from 'react';
import { useActivities } from './ActivityContext';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  linkedNotes: string[];
}

interface NotesContextType {
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNotes'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => void;
  addLink: (sourceId: string, targetId: string) => void;
  removeLink: (sourceId: string, targetId: string) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const { addActivity } = useActivities();

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNotes'>) => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedNotes: []
    };
    setNotes(prev => [newNote, ...prev]);

    addActivity({
      actionType: 'create',
      itemType: note.tags.includes('idea') ? 'idea' : 'note',
      itemId: newNote.id,
      itemTitle: newNote.title,
      description: `Created ${note.tags.includes('idea') ? 'idea' : 'note'}: ${newNote.title}`,
      metadata: {
        tags: newNote.tags
      }
    });
  }, [addActivity]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => {
      const noteIndex = prev.findIndex(note => note.id === id);
      if (noteIndex === -1) return prev;

      const oldNote = prev[noteIndex];
      const updatedNote = {
        ...oldNote,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const newNotes = [...prev];
      newNotes[noteIndex] = updatedNote;

      addActivity({
        actionType: 'edit',
        itemType: oldNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updates.title || oldNote.title,
        description: `Updated ${oldNote.tags.includes('idea') ? 'idea' : 'note'}: ${updates.title || oldNote.title}`,
        metadata: {
          previousTitle: oldNote.title,
          newTitle: updates.title,
          previousContent: oldNote.content,
          newContent: updates.content,
          tags: updates.tags || oldNote.tags
        }
      });

      return newNotes;
    });
  }, [addActivity]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteToDelete = prev.find(note => note.id === id);
      if (!noteToDelete) return prev;

      addActivity({
        actionType: 'delete',
        itemType: noteToDelete.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: noteToDelete.title,
        description: `Deleted ${noteToDelete.tags.includes('idea') ? 'idea' : 'note'}: ${noteToDelete.title}`,
        metadata: {
          tags: noteToDelete.tags
        }
      });

      return prev.filter(note => note.id !== id);
    });
  }, [addActivity]);

  const togglePinNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteIndex = prev.findIndex(note => note.id === id);
      if (noteIndex === -1) return prev;

      const note = prev[noteIndex];
      const newNotes = [...prev];
      newNotes[noteIndex] = { ...note, isPinned: !note.isPinned };

      addActivity({
        actionType: note.isPinned ? 'unpin' : 'pin',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `${note.isPinned ? 'Unpinned' : 'Pinned'} ${note.tags.includes('idea') ? 'idea' : 'note'}: ${note.title}`
      });

      return newNotes;
    });
  }, [addActivity]);

  const toggleFavoriteNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteIndex = prev.findIndex(note => note.id === id);
      if (noteIndex === -1) return prev;

      const note = prev[noteIndex];
      const newNotes = [...prev];
      newNotes[noteIndex] = { ...note, isFavorite: !note.isFavorite };

      addActivity({
        actionType: note.isFavorite ? 'unfavorite' : 'favorite',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `${note.isFavorite ? 'Removed from' : 'Added to'} favorites: ${note.title}`
      });

      return newNotes;
    });
  }, [addActivity]);

  const archiveNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteIndex = prev.findIndex(note => note.id === id);
      if (noteIndex === -1) return prev;

      const note = prev[noteIndex];
      const newNotes = [...prev];
      newNotes[noteIndex] = {
        ...note,
        isArchived: true,
        archivedAt: new Date().toISOString()
      };

      addActivity({
        actionType: 'archive',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `Archived ${note.tags.includes('idea') ? 'idea' : 'note'}: ${note.title}`
      });

      return newNotes;
    });
  }, [addActivity]);

  const unarchiveNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteIndex = prev.findIndex(note => note.id === id);
      if (noteIndex === -1) return prev;

      const note = prev[noteIndex];
      const newNotes = [...prev];
      newNotes[noteIndex] = {
        ...note,
        isArchived: false,
        archivedAt: undefined
      };

      addActivity({
        actionType: 'unarchive',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `Unarchived ${note.tags.includes('idea') ? 'idea' : 'note'}: ${note.title}`
      });

      return newNotes;
    });
  }, [addActivity]);

  const addLink = useCallback((sourceId: string, targetId: string) => {
    setNotes(prev => prev.map(note => {
      if (note.id === sourceId) {
        const currentLinks = note.linkedNotes || [];
        if (!currentLinks.includes(targetId)) {
          return {
            ...note,
            linkedNotes: [...currentLinks, targetId],
            updatedAt: new Date().toISOString()
          };
        }
      }
      if (note.id === targetId) {
        const currentLinks = note.linkedNotes || [];
        if (!currentLinks.includes(sourceId)) {
          return {
            ...note,
            linkedNotes: [...currentLinks, sourceId],
            updatedAt: new Date().toISOString()
          };
        }
      }
      return note;
    }));
  }, []);

  const removeLink = useCallback((sourceId: string, targetId: string) => {
    setNotes(prev => prev.map(note => {
      if (note.id === sourceId || note.id === targetId) {
        return {
          ...note,
          linkedNotes: (note.linkedNotes || []).filter(id => 
            id !== (note.id === sourceId ? targetId : sourceId)
          ),
          updatedAt: new Date().toISOString()
        };
      }
      return note;
    }));
  }, []);

  return (
    <NotesContext.Provider value={{
      notes,
      addNote,
      updateNote,
      deleteNote,
      togglePinNote,
      toggleFavoriteNote,
      archiveNote,
      unarchiveNote,
      addLink,
      removeLink
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}