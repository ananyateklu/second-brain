import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useActivities } from './ActivityContext';
import { notesService } from '../services/api/notes.service';

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

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const fetchedNotes = await notesService.getNotes();
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    
    loadNotes();
  }, []);

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNotes'>) => {
    try {
      const newNote = await notesService.createNote(note);
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
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }, [addActivity]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      const updatedNote = await notesService.updateNote(id, updates);
      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: 'edit',
        itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updatedNote.title,
        description: `Updated ${updatedNote.tags.includes('idea') ? 'idea' : 'note'}: ${updatedNote.title}`,
        metadata: {
          ...updates
        }
      });
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
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

  const togglePinNote = useCallback(async (id: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = await notesService.updateNote(id, {
        isPinned: !noteToUpdate.isPinned,
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: updatedNote.isPinned ? 'pin' : 'unpin',
        itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updatedNote.title,
        description: `${updatedNote.isPinned ? 'Pinned' : 'Unpinned'} ${updatedNote.tags.includes('idea') ? 'idea' : 'note'}: ${updatedNote.title}`,
        metadata: {
          isPinned: updatedNote.isPinned,
        },
      });
    } catch (error) {
      console.error('Failed to toggle pin status:', error);
    }
  }, [notes, addActivity]);

  const toggleFavoriteNote = useCallback(async (id: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = await notesService.updateNote(id, {
        isFavorite: !noteToUpdate.isFavorite,
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: updatedNote.isFavorite ? 'favorite' : 'unfavorite',
        itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updatedNote.title,
        description: `${updatedNote.isFavorite ? 'Added to' : 'Removed from'} favorites: ${updatedNote.title}`,
        metadata: {
          isFavorite: updatedNote.isFavorite,
        },
      });
    } catch (error) {
      console.error('Failed to toggle favorite status:', error);
    }
  }, [notes, addActivity]);

  const archiveNote = useCallback(async (id: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = await notesService.updateNote(id, {
        isArchived: true,
        archivedAt: new Date().toISOString(),
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: 'archive',
        itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updatedNote.title,
        description: `Archived ${updatedNote.tags.includes('idea') ? 'idea' : 'note'}: ${updatedNote.title}`,
        metadata: {
          isArchived: true,
        },
      });
    } catch (error) {
      console.error('Failed to archive note:', error);
    }
  }, [notes, addActivity]);

  const unarchiveNote = useCallback(async (id: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = await notesService.updateNote(id, {
        isArchived: false,
        archivedAt: null,
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: 'unarchive',
        itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: updatedNote.title,
        description: `Unarchived ${updatedNote.tags.includes('idea') ? 'idea' : 'note'}: ${updatedNote.title}`,
        metadata: {
          isArchived: false,
        },
      });
    } catch (error) {
      console.error('Failed to unarchive note:', error);
    }
  }, [notes, addActivity]);

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