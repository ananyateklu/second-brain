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
  linkedNoteIds: string[];
  linkedNotes?: string[];
}

interface NotesContextType {
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes'>) => void;
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
        console.log('Fetched notes:', fetchedNotes);
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    
    loadNotes();
  }, []);

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes'>) => {
    try {
      const noteWithSafeTags = {
        ...note,
        tags: Array.isArray(note.tags) ? note.tags : [],
      };
      
      const newNote = await notesService.createNote(noteWithSafeTags);
      
      console.log('New note before adding to state:', newNote);
      
      const safeNewNote: Note = {
        ...newNote,
        tags: Array.isArray(newNote.tags) ? newNote.tags : [],
        linkedNoteIds: Array.isArray(newNote.linkedNoteIds) ? newNote.linkedNoteIds : [],
        linkedNotes: Array.isArray(newNote.linkedNoteIds) ? newNote.linkedNoteIds : [],
      };
      
      setNotes(prev => {
        console.log('Previous notes:', prev);
        console.log('Adding new note:', safeNewNote);
        return [safeNewNote, ...prev];
      });

      addActivity({
        actionType: 'create',
        itemType: safeNewNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: safeNewNote.id,
        itemTitle: safeNewNote.title,
        description: `Created ${safeNewNote.tags.includes('idea') ? 'idea' : 'note'}: ${safeNewNote.title}`,
        metadata: {
          tags: safeNewNote.tags
        }
      });
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }, [addActivity]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      if (updates.isArchived !== undefined) {
        return;
      }

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

  const deleteNote = useCallback(async (id: string) => {
    try {
      const noteToDelete = notes.find(note => note.id === id);
      if (!noteToDelete) return;

      await notesService.deleteNote(id);

      setNotes(prev => prev.filter(note => note.id !== id));

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
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }, [notes, addActivity]);

  const togglePinNote = useCallback(async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const updatedNote = await notesService.updateNote(id, {
        isPinned: !note.isPinned
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: 'update',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `${note.isPinned ? 'Unpinned' : 'Pinned'} ${note.tags.includes('idea') ? 'idea' : 'note'}: ${note.title}`,
        metadata: {
          isPinned: !note.isPinned
        }
      });
    } catch (error) {
      console.error('Failed to toggle pin status:', error);
    }
  }, [notes, addActivity]);

  const toggleFavoriteNote = useCallback(async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const updatedNote = await notesService.updateNote(id, {
        isFavorite: !note.isFavorite
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? updatedNote : note))
      );

      addActivity({
        actionType: 'update',
        itemType: note.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `${note.isFavorite ? 'Removed from' : 'Added to'} favorites: ${note.title}`,
        metadata: {
          isFavorite: !note.isFavorite
        }
      });
    } catch (error) {
      console.error('Failed to toggle favorite status:', error);
    }
  }, [notes, addActivity]);

  const archiveNote = useCallback(async (id: string) => {
    try {
      const noteToArchive = notes.find(n => n.id === id);
      if (!noteToArchive) return;

      await notesService.updateNote(id, {
        isArchived: true,
        archivedAt: new Date().toISOString()
      });

      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));

      addActivity({
        actionType: 'archive',
        itemType: noteToArchive.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: noteToArchive.title,
        description: `Archived ${noteToArchive.tags.includes('idea') ? 'idea' : 'note'}: ${noteToArchive.title}`,
        metadata: {
          isArchived: true,
          archivedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to archive note:', error);
      throw error;
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

  const addLink = useCallback(async (sourceId: string, targetId: string) => {
    try {
      const updatedNote = await notesService.addLink(sourceId, targetId);
      
      setNotes(prev => prev.map(note => {
        if (note.id === sourceId) {
          return {
            ...note,
            linkedNoteIds: updatedNote.linkedNoteIds,
            linkedNotes: updatedNote.linkedNoteIds,
            updatedAt: updatedNote.updatedAt
          };
        }
        if (note.id === targetId) {
          return {
            ...note,
            linkedNoteIds: [...(note.linkedNoteIds || []), sourceId],
            linkedNotes: [...(note.linkedNoteIds || []), sourceId],
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      }));

      addActivity({
        actionType: 'link',
        itemType: 'note',
        itemId: sourceId,
        itemTitle: notes.find(n => n.id === sourceId)?.title || '',
        description: `Linked notes: ${notes.find(n => n.id === sourceId)?.title} ↔ ${notes.find(n => n.id === targetId)?.title}`,
        metadata: {
          sourceNoteId: sourceId,
          targetNoteId: targetId,
          sourceNoteTitle: notes.find(n => n.id === sourceId)?.title,
          targetNoteTitle: notes.find(n => n.id === targetId)?.title
        }
      });
    } catch (error) {
      console.error('Failed to add link:', error);
      throw error;
    }
  }, [notes, addActivity]);

  const removeLink = useCallback(async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId) {
      console.error('Missing required IDs:', { sourceId, targetId });
      return;
    }

    try {
      await notesService.removeLink(sourceId, targetId);
      
      setNotes(prev => prev.map(note => {
        if (note.id === sourceId || note.id === targetId) {
          return {
            ...note,
            linkedNoteIds: (note.linkedNoteIds || []).filter(id => 
              id !== (note.id === sourceId ? targetId : sourceId)
            ),
            linkedNotes: (note.linkedNoteIds || []).filter(id => 
              id !== (note.id === sourceId ? targetId : sourceId)
            ),
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      }));

      const sourceNote = notes.find(n => n.id === sourceId);
      const targetNote = notes.find(n => n.id === targetId);

      addActivity({
        actionType: 'unlink',
        itemType: 'note',
        itemId: sourceId,
        itemTitle: sourceNote?.title || '',
        description: `Unlinked notes: ${sourceNote?.title} ↮ ${targetNote?.title}`,
        metadata: {
          sourceNoteId: sourceId,
          targetNoteId: targetId,
          sourceNoteTitle: sourceNote?.title,
          targetNoteTitle: targetNote?.title
        }
      });
    } catch (error) {
      console.error('Failed to remove link:', error);
      throw error;
    }
  }, [notes, addActivity]);

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