import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { NotesContext, useNotes } from './notesContextUtils';
import { useActivities } from './activityContextUtils';
import { notesService, type UpdateNoteData } from '../services/api/notes.service';
import { useTrash } from './trashContextUtils';
import { useAuth } from '../hooks/useAuth';
import { sortNotes } from '../utils/noteUtils';
import type { Note } from '../types/note';
import { useReminders } from './remindersContextUtils';

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createActivity } = useActivities();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();

  const isLoadingArchived = useRef(false);

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
          linkedTasks: note.linkedTasks || [],
          linkedReminders: note.linkedReminders || []
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

  const createSafeNote = (newNote: Note): Note => ({
    ...newNote,
    tags: Array.isArray(newNote.tags) ? newNote.tags : [],
    linkedNoteIds: Array.isArray(newNote.linkedNoteIds) ? newNote.linkedNoteIds : [],
    isArchived: false,
    isDeleted: false,
    linkedTasks: Array.isArray(newNote.linkedTasks) ? newNote.linkedTasks : [],
    linkedReminders: Array.isArray(newNote.linkedReminders) ? newNote.linkedReminders : []
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

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks' | 'linkedReminders'>) => {
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

      // Trigger user stats update through the backend
      await notesService.triggerUserStatsUpdate();
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
        linkedTasks: currentNote.linkedTasks,
        linkedReminders: currentNote.linkedReminders
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
      const noteToUnarchive = archivedNotes.find(n => n.id === id);
      if (!noteToUnarchive) throw new Error('Note not found in archived notes');

      const updatedNote = await notesService.unarchiveNote(id);
      if (!updatedNote) throw new Error('Failed to unarchive note');

      const restoredNote: Note = {
        ...noteToUnarchive,
        ...updatedNote,
        isArchived: false,
        isIdea: noteToUnarchive.isIdea || false
      };

      // Update both states atomically
      setNotes(prevNotes => sortNotes([...prevNotes, restoredNote]));
      setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== id));

      // Add activity logging for unarchiving
      createActivity({
        actionType: 'restore',
        itemType: restoredNote.tags.includes('idea') ? 'idea' : 'note',
        itemId: restoredNote.id,
        itemTitle: restoredNote.title,
        description: `Restored ${restoredNote.tags.includes('idea') ? 'idea' : 'note'} from archive: ${restoredNote.title}`,
        metadata: {
          tags: restoredNote.tags,
          restoredAt: new Date().toISOString()
        }
      });

      return restoredNote;
    } catch (error) {
      console.error('Error unarchiving note:', error);
      throw error;
    }
  }, [archivedNotes, createActivity]);

  const updateNoteWithLinks = (note: Note, linkedNoteIds: string[], allNotes: Note[]): Note => {
    return {
      ...note,
      linkedNoteIds,
      linkedNotes: allNotes.filter(n => linkedNoteIds.includes(n.id))
    };
  };

  const addLink = useCallback(async (sourceId: string, targetId: string) => {
    try {
      const { sourceNote, targetNote } = await notesService.addLink(sourceId, targetId);
      setNotes(prev => {
        const updatedNotes = prev.map(note => {
          if (note.id === sourceId) {
            return updateNoteWithLinks(note, sourceNote.linkedNoteIds, prev);
          }
          if (note.id === targetId) {
            return updateNoteWithLinks(note, targetNote.linkedNoteIds, prev);
          }
          return note;
        });
        return updatedNotes;
      });
    } catch (error) {
      console.error('Failed to add link:', error);
      throw error;
    }
  }, []);

  const removeLink = useCallback(async (sourceId: string, targetId: string) => {
    try {
      // Get updated notes from the backend after unlinking
      const { sourceNote, targetNote } = await notesService.removeLink(sourceId, targetId);

      // Update notes state with the fresh data from backend
      setNotes(prev => {
        const updatedNotes = prev.map(note => {
          if (note.id === sourceId) {
            // Use the fresh source note data
            return {
              ...note,
              ...sourceNote,
              linkedNoteIds: sourceNote.linkedNoteIds,
              linkedNotes: sourceNote.linkedNotes || []
            };
          }
          if (note.id === targetId) {
            // Use the fresh target note data
            return {
              ...note,
              ...targetNote,
              linkedNoteIds: targetNote.linkedNoteIds,
              linkedNotes: targetNote.linkedNotes || []
            };
          }
          return note;
        });

        // Return a new array to ensure React detects the change
        return [...updatedNotes];
      });

      // Create activity if available
      if (createActivity) {
        createActivity({
          actionType: 'unlink',
          itemType: 'note',
          itemId: targetId,
          itemTitle: targetNote.title,
          description: `Unlinked note "${targetNote.title}" from "${sourceNote.title}"`,
          metadata: {
            sourceNoteId: sourceId,
            targetNoteId: targetId
          }
        });
      }
    } catch (error) {
      console.error('Failed to remove link:', error);
      throw error;
    }
  }, [createActivity]);

  const linkReminder = useCallback(async (noteId: string, reminderId: string) => {
    try {
      console.log('Linking reminder:', { noteId, reminderId });
      await notesService.linkReminder(noteId, reminderId);

      // Refresh all notes to get the latest state
      await fetchNotes();

      if (createActivity) {
        const note = notes.find(n => n.id === noteId);
        createActivity({
          actionType: 'link',
          itemType: 'reminder',
          itemId: reminderId,
          itemTitle: note?.title ?? '',
          description: `Linked reminder to note: ${note?.title}`,
          metadata: {
            noteId,
            reminderId
          }
        });
      }

      const updatedNote = notes.find(n => n.id === noteId);
      if (!updatedNote) {
        throw new Error('Note not found after linking reminder');
      }

      return updatedNote;
    } catch (error) {
      console.error('Failed to link reminder:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  }, [notes, createActivity, fetchNotes]);

  const unlinkReminder = useCallback(async (noteId: string, reminderId: string) => {
    try {
      await notesService.unlinkReminder(noteId, reminderId);

      // Refresh all notes to get the latest state
      await fetchNotes();

      const updatedNote = notes.find(n => n.id === noteId);
      if (!updatedNote) {
        throw new Error('Note not found after unlinking reminder');
      }

      return updatedNote;
    } catch (error) {
      console.error('Failed to unlink reminder:', error);
      throw error;
    }
  }, [fetchNotes, notes]);

  const loadArchivedNotes = useCallback(async () => {
    try {
      console.log('loadArchivedNotes called'); // Debug log
      // Add loading state to prevent duplicate calls
      if (isLoadingArchived.current) {
        console.log('Already loading archived notes, skipping');
        return;
      }

      // If we already have archived notes, don't fetch again
      if (archivedNotes.length > 0) {
        console.log('Archived notes already loaded, skipping fetch');
        return;
      }

      isLoadingArchived.current = true;

      const fetchedArchivedNotes = await notesService.getArchivedNotes();
      const processedNotes = fetchedArchivedNotes.map(note => ({
        ...note,
        isArchived: true,
        isDeleted: false,
        isIdea: note.isIdea || false,
        linkedNoteIds: note.linkedNoteIds || [],
        linkedNotes: [],
        linkedTasks: [],
        linkedReminders: []
      })) as Note[];

      setArchivedNotes(processedNotes);
      isLoadingArchived.current = false;
    } catch (error) {
      console.error('Failed to load archived notes:', error);
      isLoadingArchived.current = false;
    }
  }, [archivedNotes.length]);

  const createBulkRestoreActivity = useCallback((restoredNotes: Note[], totalResults: number) => {
    const getRestoreDescription = (noteCount: number, ideaCount: number) => {
      if (noteCount > 0 && ideaCount > 0) {
        return `Restored ${noteCount} note${noteCount > 1 ? 's' : ''} and ${ideaCount} idea${ideaCount > 1 ? 's' : ''} from archive`;
      }
      if (noteCount > 0) {
        return `Restored ${noteCount} note${noteCount > 1 ? 's' : ''} from archive`;
      }
      return `Restored ${ideaCount} idea${ideaCount > 1 ? 's' : ''} from archive`;
    };

    const getRestoreTitle = (noteCount: number, ideaCount: number) => {
      if (noteCount > 0 && ideaCount > 0) {
        return `${noteCount} notes and ${ideaCount} ideas`;
      }
      if (noteCount > 0) {
        return `${noteCount} notes`;
      }
      return `${ideaCount} ideas`;
    };

    const noteCount = restoredNotes.filter(note => !note.tags.includes('idea')).length;
    const ideaCount = restoredNotes.filter(note => note.tags.includes('idea')).length;

    createActivity({
      actionType: 'restore_multiple',
      itemType: 'notes',
      itemId: 'bulk',
      itemTitle: getRestoreTitle(noteCount, ideaCount),
      description: getRestoreDescription(noteCount, ideaCount),
      metadata: {
        totalNotes: totalResults,
        noteCount,
        ideaCount,
        successfulRestores: restoredNotes.length,
        failedRestores: totalResults - restoredNotes.length,
        restoredNoteIds: restoredNotes.map(note => note.id),
        restoredNoteTitles: restoredNotes.map(note => note.title),
        restoredAt: new Date().toISOString()
      }
    });
  }, [createActivity]);

  const restoreMultipleNotes = useCallback(async (ids: string[]) => {
    try {
      const results = await Promise.allSettled(
        ids.map(id => unarchiveNote(id))
      );

      if (results.length > 1) {
        const successfulRestores = results.filter(
          (result): result is PromiseFulfilledResult<Note> =>
            result.status === 'fulfilled' && result.value !== undefined
        );

        const restoredNotes = successfulRestores.map(result => result.value);
        createBulkRestoreActivity(restoredNotes, results.length);
      }

      return results;
    } catch (error) {
      console.error('Failed to restore multiple notes:', error);
      throw error;
    }
  }, [unarchiveNote, createBulkRestoreActivity]);

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

  const addReminderToNote = useCallback(async (noteId: string, reminderId: string) => {
    try {
      const updatedNote = await notesService.linkReminder(noteId, reminderId);

      // Update the notes state with the new reminder link
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId
            ? {
              ...note,
              linkedReminders: updatedNote.linkedReminders || []
            }
            : note
        )
      );

      await createActivity({
        actionType: 'link',
        itemType: 'note',
        itemId: noteId,
        itemTitle: updatedNote.title,
        description: `Linked reminder to note: ${updatedNote.title}`,
        metadata: {
          reminderId,
        },
      });
    } catch (error) {
      console.error('Failed to add reminder to note:', error);
      throw error;
    }
  }, [createActivity]);

  const removeReminderFromNote = useCallback(async (noteId: string, reminderId: string) => {
    try {
      const updatedNote = await notesService.unlinkReminder(noteId, reminderId);

      // Update the notes state by removing the reminder link
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId
            ? {
              ...note,
              linkedReminders: updatedNote.linkedReminders || []
            }
            : note
        )
      );

      const note = notes.find(n => n.id === noteId);
      if (note) {
        await createActivity({
          actionType: 'unlink',
          itemType: 'note',
          itemId: noteId,
          itemTitle: note.title,
          description: `Unlinked reminder from note: ${note.title}`,
          metadata: {
            reminderId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to remove reminder from note:', error);
      throw error;
    }
  }, [notes, createActivity]);

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
    linkReminder,
    unlinkReminder,
    loadArchivedNotes,
    restoreMultipleNotes,
    restoreNote,
    fetchNotes,
    addReminderToNote,
    removeReminderFromNote
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
    linkReminder,
    unlinkReminder,
    loadArchivedNotes,
    restoreMultipleNotes,
    restoreNote,
    fetchNotes,
    addReminderToNote,
    removeReminderFromNote
  ]);

  // Add a subscription to task changes
  useEffect(() => {
    const handleTaskChange = async () => {
      // Refresh notes to get updated task links
      await fetchNotes();
    };

    // Subscribe to task changes
    window.addEventListener('taskChange', handleTaskChange);

    return () => {
      window.removeEventListener('taskChange', handleTaskChange);
    };
  }, [fetchNotes]);

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
}

// Create a wrapper component that handles reminder state updates
export function NotesWithRemindersProvider({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <NotesRemindersSync>
        {children}
      </NotesRemindersSync>
    </NotesProvider>
  );
}

// Component to handle reminder state synchronization
function NotesRemindersSync({ children }: { children: React.ReactNode }) {
  const { notes } = useNotes();
  const { fetchReminders } = useReminders();

  useEffect(() => {
    // Always refresh reminders when notes change, since we can't reliably
    // track when reminder links are added or removed just by looking at the current state
    fetchReminders();
  }, [notes, fetchReminders]);

  return <>{children}</>;
}