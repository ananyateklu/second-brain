import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { NotesContext } from './notesContextUtils';
import { useActivities } from './activityContextUtils';
import { notesService, type UpdateNoteData } from '../services/api/notes.service';
import { useTrash } from './trashContextUtils';
import { useAuth } from '../hooks/useAuth';
import { sortNotes } from '../utils/noteUtils';
import type { Note } from '../types/note';

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createActivity } = useActivities();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await notesService.getAllNotes();
      console.log('Fetched notes:', fetchedNotes); // Debug log
      
      const processedNotes = fetchedNotes
        .filter(note => !note.isArchived && !note.isDeleted)
        .map(note => ({
          ...note,
          isArchived: false,
          isDeleted: false,
          isIdea: note.isIdea || false,
          linkedNoteIds: note.linkedNoteIds || [],
          linkedNotes: note.linkedNotes || [],
          linkedTasks: note.linkedTasks || []
        })) as Note[];
      
      console.log('Processed notes:', processedNotes); // Debug log
      setNotes(sortNotes(processedNotes));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  useEffect(() => {
  }, [notes]);

  const createSafeNote = (newNote: Note): Note => ({
    ...newNote,
    tags: Array.isArray(newNote.tags) ? newNote.tags : [],
    linkedNoteIds: Array.isArray(newNote.linkedNoteIds) ? newNote.linkedNoteIds : [],
    isArchived: false,
    isDeleted: false,
    linkedTasks: Array.isArray(newNote.linkedTasks) ? newNote.linkedTasks : []
  });

  const logActivityError = (error: unknown, context: string) => {
    console.error(`Failed to add activity: ${context}`, error);
  };

  const createNoteActivity = useCallback(async (note: Note) => {
    if (!createActivity) return;
    
    try {
      await createActivity({
        actionType: 'create',
        itemType: note.isIdea ? 'idea' : 'note',
        itemId: note.id,
        itemTitle: note.title,
        description: `Created ${note.isIdea ? 'idea' : 'note'}: ${note.title}`,
        metadata: { tags: note.tags }
      });
    } catch (error) {
      logActivityError(error, 'create note');
    }
  }, [createActivity]);

  const updateNoteActivity = useCallback(async (note: Note, updates: Partial<Note>) => {
    if (!createActivity) return;
    
    try {
      await createActivity({
        actionType: 'edit',
        itemType: note.isIdea ? 'idea' : 'note',
        itemId: note.id,
        itemTitle: note.title,
        description: `Updated ${note.isIdea ? 'idea' : 'note'}: ${note.title}`,
        metadata: { ...updates }
      });
    } catch (error) {
      logActivityError(error, 'update note');
    }
  }, [createActivity]);

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks'>) => {
    try {
      const noteWithSafeTags = {
        ...note,
        tags: Array.isArray(note.tags) ? note.tags : [],
      };

      const newNote = await notesService.createNote(noteWithSafeTags);
      if (newNote.isDeleted || newNote.isArchived) return;

      const safeNewNote = createSafeNote(newNote);
      setNotes(prev => sortNotes([safeNewNote, ...prev]));
      await createNoteActivity(safeNewNote);
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }, [createNoteActivity]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note> => {
    try {
      if (updates.isArchived !== undefined) {
        throw new Error('Cannot update archive status directly');
      }
      
      const currentNote = notes.find(n => n.id === id);
      if (!currentNote) throw new Error('Note not found');

      const updatedNote = await notesService.updateNote(id, updates);
      const safeUpdatedNote = {
        ...updatedNote,
        isArchived: false,
        isDeleted: false,
        tags: Array.isArray(updatedNote.tags) ? updatedNote.tags : [],
        linkedNoteIds: currentNote.linkedNoteIds,
        linkedNotes: currentNote.linkedNotes,
        linkedTasks: currentNote.linkedTasks
      };

      setNotes(prevNotes => {
        const updatedNotes = prevNotes
          .map(note => (note.id === id ? safeUpdatedNote : note))
          .filter(note => !note.isDeleted && !note.isArchived);
        return sortNotes(updatedNotes);
      });

      await updateNoteActivity(safeUpdatedNote, updates);
      return safeUpdatedNote;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }, [notes, updateNoteActivity]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      const noteToDelete = notes.find(note => note.id === id);
      if (!noteToDelete) return;

      // Remove from notes list immediately
      setNotes(prev => prev.filter(note => note.id !== id));

      // Mark as deleted in backend
      const updateData: Partial<UpdateNoteData> = {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        title: noteToDelete.title,
        content: noteToDelete.content,
        tags: noteToDelete.tags,
        isFavorite: noteToDelete.isFavorite,
        linkedNoteIds: noteToDelete.linkedNoteIds
      };

      await notesService.updateNote(id, updateData);

      // Move to trash
      await moveToTrash({
        id: noteToDelete.id,
        type: noteToDelete.tags.includes('idea') ? 'idea' : 'note',
        title: noteToDelete.title,
        content: noteToDelete.content,
        metadata: {
          tags: noteToDelete.tags,
          linkedItems: noteToDelete.linkedNoteIds,
          isFavorite: noteToDelete.isFavorite
        }
      });

      createActivity({
        actionType: 'delete',
        itemType: noteToDelete.tags.includes('idea') ? 'idea' : 'note',
        itemId: id,
        itemTitle: noteToDelete.title,
        description: `Moved ${noteToDelete.tags.includes('idea') ? 'idea' : 'note'} to trash: ${noteToDelete.title}`,
        metadata: {
          noteId: id,
          noteTitle: noteToDelete.title,
          noteTags: noteToDelete.tags,
          deletedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
      // Rollback the state change if the API call fails
      const noteToDelete = notes.find(note => note.id === id);
      if (noteToDelete) {
        setNotes(prev => [...prev, noteToDelete]);
      }
      throw error;
    }
  }, [notes, moveToTrash, createActivity]);

  const togglePinNote = useCallback(async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const updatedNote = await notesService.updateNote(id, {
        isPinned: !note.isPinned
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? { ...note, ...updatedNote } : note))
      );

      createActivity({
        actionType: 'update',
        itemType: note.isIdea ? 'idea' : 'note',
        itemId: id,
        itemTitle: note.title,
        description: `${note.isPinned ? 'Unpinned' : 'Pinned'} ${note.isIdea ? 'idea' : 'note'}: ${note.title}`,
        metadata: {
          isPinned: !note.isPinned
        }
      });
    } catch (error) {
      console.error('Failed to toggle pin status:', error);
    }
  }, [notes, createActivity]);

  const toggleFavoriteNote = useCallback(async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const updatedNote = await notesService.updateNote(id, {
        isFavorite: !note.isFavorite
      });

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === id ? { ...note, ...updatedNote } : note))
      );

      createActivity({
        actionType: 'update',
        itemType: note.isIdea ? 'idea' : 'note',
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
  }, [notes, createActivity]);

  const archiveNote = useCallback(async (id: string) => {
    try {
      const noteToArchive = notes.find(n => n.id === id);
      if (!noteToArchive) return;

      const updateData: Partial<UpdateNoteData> = {
        isArchived: true,
        archivedAt: new Date().toISOString()
      };

      await notesService.updateNote(id, updateData);

      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));

      createActivity({
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
  }, [notes, createActivity]);

  const unarchiveNote = useCallback(async (id: string): Promise<Note> => {
    try {
      const updatedNote = await notesService.unarchiveNote(id);
      if (!updatedNote) throw new Error('Failed to unarchive note');
      
      const noteToUnarchive = archivedNotes.find(n => n.id === id);
      if (!noteToUnarchive) throw new Error('Note not found in archived notes');

      const restoredNote: Note = {
        ...noteToUnarchive,
        ...updatedNote,
        isArchived: false,
        isIdea: noteToUnarchive.isIdea || false
      };

      setNotes(prevNotes => sortNotes([...prevNotes, restoredNote]));
      setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== id));

      return restoredNote;
    } catch (error) {
      console.error('Error unarchiving note:', error);
      throw error;
    }
  }, [archivedNotes]);

  // Add a method for restoring multiple notes
  const restoreMultipleNotes = useCallback(async (ids: string[]) => {
    try {
      const results = await Promise.allSettled(
        ids.map(id => unarchiveNote(id))
      );

      // Add activity for bulk restore
      if (results.length > 1) {
        const successfulRestores = results.filter(
          (result): result is PromiseFulfilledResult<Note> =>
            result.status === 'fulfilled' && result.value !== undefined
        );

        const restoredNotes = successfulRestores.map(result => result.value);

        createActivity({
          actionType: 'restore_multiple',
          itemType: 'notes',
          itemId: 'bulk',
          itemTitle: `${results.length} notes`,
          description: `Restored ${results.length} notes from archive`,
          metadata: {
            totalNotes: results.length,
            successfulRestores: successfulRestores.length,
            failedRestores: results.length - successfulRestores.length,
            restoredNoteIds: restoredNotes.map(note => note.id),
            restoredNoteTitles: restoredNotes.map(note => note.title),
            restoredAt: new Date().toISOString()
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to restore multiple notes:', error);
      throw error;
    }
  }, [unarchiveNote, createActivity]);

  const updateNoteWithLinks = (note: Note, linkedNoteIds: string[], allNotes: Note[]): Note => {
    return {
      ...note,
      linkedNoteIds,
      linkedNotes: allNotes.filter(n => linkedNoteIds.includes(n.id))
    };
  };

  const addLink = useCallback(async (sourceId: string, targetId: string) => {
    setNotes(prev => {
      const sourceNote = prev.find(n => n.id === sourceId);
      const targetNote = prev.find(n => n.id === targetId);
      
      if (!sourceNote || !targetNote) return prev;

      const updatedNotes = prev.map(note => {
        if (note.id === sourceId) {
          const newLinkedIds = [...new Set([...note.linkedNoteIds, targetId])];
          return updateNoteWithLinks(note, newLinkedIds, prev);
        }
        if (note.id === targetId) {
          const newLinkedIds = [...new Set([...note.linkedNoteIds, sourceId])];
          return updateNoteWithLinks(note, newLinkedIds, prev);
        }
        return note;
      });

      return updatedNotes;
    });
  }, []);

  const removeNoteLinks = (note: Note, otherNoteId: string): Note => {
    return {
      ...note,
      linkedNoteIds: note.linkedNoteIds.filter(id => id !== otherNoteId),
      linkedNotes: (note.linkedNotes || []).filter(n => n.id !== otherNoteId)
    };
  };

  const removeLink = useCallback(async (sourceId: string, targetId: string) => {
    setNotes(prev => {
      const updatedNotes = prev.map(note => {
        if (note.id === sourceId || note.id === targetId) {
          const otherNoteId = note.id === sourceId ? targetId : sourceId;
          return removeNoteLinks(note, otherNoteId);
        }
        return note;
      });
      return updatedNotes;
    });
  }, []);

  const loadArchivedNotes = useCallback(async () => {
    try {
      const fetchedArchivedNotes = await notesService.getArchivedNotes();
      const processedNotes = fetchedArchivedNotes.map(note => ({
        ...note,
        isArchived: true,
        isDeleted: false,
        isIdea: note.isIdea || false,
        linkedNoteIds: note.linkedNoteIds || [],
        linkedNotes: [],
        linkedTasks: []
      })) as Note[];
      
      setArchivedNotes(processedNotes);
    } catch (error) {
      console.error('Failed to load archived notes:', error);
    }
  }, []);

  const restoreNote = useCallback(async (restoredNote: Note) => {
    try {
      // Check if note already exists in state
      setNotes(prevNotes => {
        if (prevNotes.some(note => note.id === restoredNote.id)) {
          return prevNotes; // Note already exists, don't add it again
        }
        return [...prevNotes, restoredNote];
      });

      // Add activity
      createActivity({
        actionType: 'restore',
        itemType: 'note',
        itemId: restoredNote.id,
        itemTitle: restoredNote.title,
        description: `Restored note from trash: ${restoredNote.title}`,
        metadata: {
          tags: restoredNote.tags
        }
      });
    } catch (error) {
      console.error('Failed to restore note:', error);
      throw error;
    }
  }, [createActivity]);

  const contextValue = useMemo(() => ({
    notes,
    archivedNotes,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
    togglePinNote,
    toggleFavoriteNote,
    archiveNote,
    unarchiveNote,
    addLink,
    removeLink,
    loadArchivedNotes,
    restoreMultipleNotes,
    restoreNote,
    fetchNotes
  }), [
    notes,
    archivedNotes,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
    togglePinNote,
    toggleFavoriteNote,
    archiveNote,
    unarchiveNote,
    addLink,
    removeLink,
    loadArchivedNotes,
    restoreMultipleNotes,
    restoreNote,
    fetchNotes
  ]);

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
}