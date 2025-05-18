import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { NotesContext } from './notesContextUtils';
import { useActivities } from './activityContextUtils';
import { notesService, type UpdateNoteData, type AddNoteLinkData, type CreateNoteData } from '../services/api/notes.service';
import { integrationsService, SyncConfig, SyncResult } from '../services/api/integrations.service';
import { useAuth } from '../hooks/useAuth';
import { sortNotes } from '../utils/noteUtils';
import type { Note } from '../types/note';
import { TickTickTask } from '../types/integrations';

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createActivity } = useActivities();
  const { user } = useAuth();

  // TickTick specific state
  const [tickTickNotes, setTickTickNotes] = useState<TickTickTask[]>([]);
  const [isTickTickLoading, setIsTickTickLoading] = useState(false);
  const [tickTickError, setTickTickError] = useState<string | null>(null);
  const [isTickTickConnected, setIsTickTickConnected] = useState<boolean>(() => {
    const stored = localStorage.getItem('ticktick_connected');
    return stored === 'true';
  });
  const [tickTickProjectId, setTickTickProjectId] = useState<string>(() => {
    return localStorage.getItem('ticktick_notes_project_id') || '';
  });

  // TickTick Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(localStorage.getItem('last_ticktick_sync_time'));
  const [syncTaskCount, setSyncTaskCount] = useState({ local: 0, tickTick: 0, mapped: 0 });

  useEffect(() => {
    localStorage.setItem('ticktick_connected', isTickTickConnected.toString());
  }, [isTickTickConnected]);

  useEffect(() => {
    localStorage.setItem('ticktick_notes_project_id', tickTickProjectId);
  }, [tickTickProjectId]);

  const logActivityError = useCallback((error: unknown, context: string) => {
    console.error('NotesContext Error:', { context, error });
    // Potentially add user-facing notification here via a notification context
  }, []);

  const createSafeNote = (newNote: Note): Note => ({
    ...newNote,
    tags: newNote.tags || [],
    isFavorite: newNote.isFavorite || false,
    isPinned: newNote.isPinned || false,
    isArchived: newNote.isArchived || false,
    isDeleted: newNote.isDeleted || false,
    linkedItems: newNote.linkedItems || [],
  });

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await notesService.getAllNotes();
      const processedNotes = fetchedNotes
        .filter(note => !note.isArchived && !note.isDeleted)
        .map(note => createSafeNote(note));
      setNotes(sortNotes(processedNotes));
    } catch (error) {
      logActivityError(error, 'fetch notes');
    } finally {
      setIsLoading(false);
    }
  }, [logActivityError]);

  const isLoadingArchived = useRef(false);
  const hasLoadedArchived = useRef(false);

  const loadArchivedNotes = useCallback(async (forceRefresh: boolean = false) => {
    if ((hasLoadedArchived.current && !forceRefresh) || isLoadingArchived.current) {
      return;
    }
    try {
      isLoadingArchived.current = true;
      const notesData = await notesService.getArchivedNotes();
      setArchivedNotes(notesData.map(n => createSafeNote(n)));
      hasLoadedArchived.current = true;
    } catch (error) {
      logActivityError(error, '[NotesContext] Failed to load archived notes:');
    } finally {
      isLoadingArchived.current = false;
    }
  }, [logActivityError]);

  useEffect(() => {
    hasLoadedArchived.current = false;
    isLoadingArchived.current = false;
  }, [user]);

  const addNote = useCallback(
    async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedItems'>) => {
      try {
        const newNote = await notesService.createNote(noteData as CreateNoteData);
        const safeNewNote = createSafeNote(newNote);
        setNotes(prevNotes => sortNotes([...prevNotes, safeNewNote]));
        createActivity({
          actionType: 'create',
          itemType: 'note',
          itemId: safeNewNote.id,
          itemTitle: safeNewNote.title,
          description: `Created note '${safeNewNote.title}'`,
        });
      } catch (error) {
        logActivityError(error, 'add note');
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      try {
        const updatedNoteData = await notesService.updateNote(id, updates as UpdateNoteData);
        const safeUpdatedNote = createSafeNote(updatedNoteData);
        setNotes(prevNotes =>
          sortNotes(prevNotes.map(note => (note.id === id ? safeUpdatedNote : note)))
        );
        if (safeUpdatedNote.isArchived) {
          setArchivedNotes(prevArchived => sortNotes([...prevArchived, safeUpdatedNote]));
          setNotes(prevNotes => sortNotes(prevNotes.filter(note => note.id !== id)));
        } else {
          setArchivedNotes(prevArchived => sortNotes(prevArchived.filter(note => note.id !== id)));
        }
        createActivity({
          actionType: 'update',
          itemType: 'note',
          itemId: safeUpdatedNote.id,
          itemTitle: safeUpdatedNote.title,
          description: `Updated note '${safeUpdatedNote.title}'`,
        });
        return safeUpdatedNote;
      } catch (error) {
        logActivityError(error, `update note ${id}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        const noteToDelete = notes.find(n => n.id === id) || archivedNotes.find(n => n.id === id);
        await notesService.deleteNote(id); // This now returns Note but we handle it as a soft delete

        setNotes(prevNotes => sortNotes(prevNotes.filter(note => note.id !== id)));
        setArchivedNotes(prevArchived => sortNotes(prevArchived.filter(note => note.id !== id)));
        if (noteToDelete) {
          // moveToTrash({ ...noteToDelete, itemType: 'note' });
          createActivity({
            actionType: 'delete',
            itemType: 'note',
            itemId: id,
            itemTitle: noteToDelete.title,
            description: `Deleted note '${noteToDelete.title}'`,
          });
        }
      } catch (error) {
        logActivityError(error, `delete note ${id}`);
        throw error;
      }
    },
    [notes, archivedNotes, createActivity, logActivityError]
  );

  const togglePinNote = useCallback(
    async (id: string) => {
      try {
        const note = notes.find(n => n.id === id);
        if (!note) throw new Error('Note not found');
        const updatedNote = await notesService.updateNote(id, { isPinned: !note.isPinned });
        const safeUpdatedNote = createSafeNote(updatedNote);
        setNotes(prevNotes =>
          sortNotes(prevNotes.map(n => (n.id === id ? safeUpdatedNote : n)))
        );
        createActivity({
          actionType: safeUpdatedNote.isPinned ? 'pin' : 'unpin',
          itemType: 'note',
          itemId: id,
          itemTitle: safeUpdatedNote.title,
          description: `${safeUpdatedNote.isPinned ? 'Pinned' : 'Unpinned'} note '${safeUpdatedNote.title}'`,
        });
      } catch (error) {
        logActivityError(error, `toggle pin for note ${id}`);
        throw error;
      }
    },
    [notes, createActivity, logActivityError]
  );

  const toggleFavoriteNote = useCallback(
    async (id: string) => {
      try {
        const note = notes.find(n => n.id === id) || archivedNotes.find(n => n.id === id);
        if (!note) throw new Error('Note not found');
        const updatedNote = await notesService.updateNote(id, { isFavorite: !note.isFavorite });
        const safeUpdatedNote = createSafeNote(updatedNote);

        if (archivedNotes.find(n => n.id === id)) {
          setArchivedNotes(prevArchived =>
            sortNotes(prevArchived.map(n => (n.id === id ? safeUpdatedNote : n)))
          );
        } else {
          setNotes(prevNotes =>
            sortNotes(prevNotes.map(n => (n.id === id ? safeUpdatedNote : n)))
          );
        }
        createActivity({
          actionType: safeUpdatedNote.isFavorite ? 'favorite' : 'unfavorite',
          itemType: 'note',
          itemId: id,
          itemTitle: safeUpdatedNote.title,
          description: `${safeUpdatedNote.isFavorite ? 'Favorited' : 'Unfavorited'} note '${safeUpdatedNote.title}'`,
        });
      } catch (error) {
        logActivityError(error, `toggle favorite for note ${id}`);
        throw error;
      }
    },
    [notes, archivedNotes, createActivity, logActivityError]
  );

  const archiveNote = useCallback(
    async (id: string) => {
      try {
        const note = notes.find(n => n.id === id);
        if (!note) throw new Error('Note not found to archive');
        const updatedNote = await notesService.updateNote(id, { isArchived: true, archivedAt: new Date().toISOString() });
        const safeUpdatedNote = createSafeNote(updatedNote);

        setNotes(prevNotes => sortNotes(prevNotes.filter(n => n.id !== id)));
        setArchivedNotes(prevArchived => sortNotes([safeUpdatedNote, ...prevArchived]));
        createActivity({
          actionType: 'archive',
          itemType: 'note',
          itemId: id,
          itemTitle: safeUpdatedNote.title,
          description: `Archived note '${safeUpdatedNote.title}'`,
        });
      } catch (error) {
        logActivityError(error, `archive note ${id}`);
        throw error;
      }
    },
    [notes, createActivity, logActivityError]
  );

  const unarchiveNote = useCallback(
    async (id: string): Promise<Note> => {
      try {
        const note = archivedNotes.find(n => n.id === id);
        if (!note) throw new Error('Note not found to unarchive');
        const updatedNote = await notesService.unarchiveNote(id);
        const safeUpdatedNote = createSafeNote(updatedNote);

        setArchivedNotes(prevArchived => sortNotes(prevArchived.filter(n => n.id !== id)));
        setNotes(prevNotes => sortNotes([safeUpdatedNote, ...prevNotes]));
        createActivity({
          actionType: 'unarchive',
          itemType: 'note',
          itemId: id,
          itemTitle: safeUpdatedNote.title,
          description: `Unarchived note '${safeUpdatedNote.title}'`,
        });
        return safeUpdatedNote;
      } catch (error) {
        logActivityError(error, `unarchive note ${id}`);
        throw error;
      }
    },
    [archivedNotes, createActivity, logActivityError]
  );

  const addLink = useCallback(
    async (noteId: string, linkedItemId: string, linkedItemType: 'Note' | 'Idea' | 'Task' | 'Reminder', linkType: string = 'related') => {
      try {
        const linkData: AddNoteLinkData = { linkedItemId, linkedItemType, linkType };
        const updatedNote = await notesService.addLink(noteId, linkData);

        setNotes(prevNotes =>
          prevNotes.map(n => (n.id === noteId ? createSafeNote(updatedNote) : n))
        );
        if (linkedItemType === 'Note') {
          const linkedNoteDetails = await notesService.getNoteById(linkedItemId);
          if (linkedNoteDetails) {
            setNotes(prevNotes =>
              prevNotes.map(n => (n.id === linkedItemId ? createSafeNote(linkedNoteDetails) : n))
            );
          }
        }
        createActivity({
          actionType: 'link_note',
          itemType: 'note',
          itemId: noteId,
          itemTitle: updatedNote.title,
          description: `Linked note '${updatedNote.title}' to ${linkedItemType} '${linkedItemId}'`
        });
        // To match NotesContextType, this should be Promise<void>
        // The service returns Promise<Note>, so if the context needs void, don't return updatedNote
      } catch (error) {
        logActivityError(error, `link note ${noteId} to ${linkedItemType} ${linkedItemId}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const removeLink = useCallback(
    async (noteId: string, linkedItemId: string, linkedItemType: string) => {
      try {
        // Optimistically find the note to log its state before update
        // originalNoteState = notes.find(n => n.id === noteId); // Variable no longer needed

        const updatedNote = await notesService.removeLink(noteId, linkedItemId, linkedItemType);
        const safeUpdatedNote = createSafeNote(updatedNote);

        setNotes(prevNotes => {
          const newNotes = prevNotes.map(n => (n.id === noteId ? safeUpdatedNote : n));
          return sortNotes(newNotes);
        });

        if (linkedItemType === 'Note') {
          // If a note was unlinked from another note, the other note's linkedItems also change.
          // We need to ensure that other note is also updated in our local state if it's present.
          const unlinkedNoteDetails = await notesService.getNoteById(linkedItemId); // This fetches the other note
          if (unlinkedNoteDetails) {
            const safeUnlinkedNoteDetails = createSafeNote(unlinkedNoteDetails);
            setNotes(prevNotes => {
              const newNotes = prevNotes.map(n => (n.id === linkedItemId ? safeUnlinkedNoteDetails : n));
              return sortNotes(newNotes);
            });
          }
        }
        createActivity({
          actionType: 'unlink_note',
          itemType: 'note',
          itemId: noteId,
          itemTitle: updatedNote.title,
          description: `Unlinked note '${updatedNote.title}' from ${linkedItemType} '${linkedItemId}'`
        });
        // To match NotesContextType, this should be Promise<void>
      } catch (error) {
        logActivityError(error, `unlink note ${noteId} from ${linkedItemType} ${linkedItemId}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const linkReminder = useCallback(
    async (noteId: string, reminderId: string): Promise<Note> => {
      try {
        const updatedNote = await notesService.linkReminder(noteId, reminderId);
        setNotes(prevNotes =>
          prevNotes.map(n => (n.id === noteId ? createSafeNote(updatedNote) : n))
        );
        createActivity({
          actionType: 'link_reminder',
          itemType: 'note',
          itemId: noteId,
          itemTitle: updatedNote.title,
          description: `Linked reminder to note '${updatedNote.title}'`,
        });
        return updatedNote;
      } catch (error) {
        logActivityError(error, `link reminder ${reminderId} to note ${noteId}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const unlinkReminder = useCallback(
    async (noteId: string, reminderId: string): Promise<Note> => {
      try {
        const updatedNote = await notesService.unlinkReminder(noteId, reminderId);
        setNotes(prevNotes =>
          prevNotes.map(n => (n.id === noteId ? createSafeNote(updatedNote) : n))
        );
        createActivity({
          actionType: 'unlink_reminder',
          itemType: 'note',
          itemId: noteId,
          itemTitle: updatedNote.title,
          description: `Unlinked reminder from note '${updatedNote.title}'`,
        });
        return updatedNote;
      } catch (error) {
        logActivityError(error, `unlink reminder ${reminderId} from note ${noteId}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const clearArchivedNotes = useCallback(() => {
    setArchivedNotes([]);
    hasLoadedArchived.current = false;
  }, []);

  const restoreMultipleNotes = useCallback(async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const note = await notesService.restoreNote(id);
        return createSafeNote(note);
      })
    );

    const successfullyRestored: Note[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successfullyRestored.push(result.value);
      } else {
        logActivityError(result.reason, `restore multiple notes - id ${ids[results.indexOf(result)]}`);
      }
    });

    if (successfullyRestored.length > 0) {
      setNotes(prev => sortNotes([...prev, ...successfullyRestored]));
      setArchivedNotes(prev => sortNotes(prev.filter(n => !ids.includes(n.id))));
      // createBulkRestoreActivity(successfullyRestored);
    }
    return results;
  }, [logActivityError]);

  const restoreNote = useCallback(
    async (restoredNoteData: Note): Promise<void> => { // Parameter changed to Note
      try {
        // The note data is already passed, assuming it's the full note object after restoration from service
        const safeRestoredNote = createSafeNote(restoredNoteData);

        setNotes(prevNotes => sortNotes([safeRestoredNote, ...prevNotes.filter(n => n.id !== safeRestoredNote.id)]));
        setArchivedNotes(prevArchived => sortNotes(prevArchived.filter(n => n.id !== safeRestoredNote.id)));
        createActivity({
          actionType: 'restore',
          itemType: 'note',
          itemId: safeRestoredNote.id,
          itemTitle: safeRestoredNote.title,
          description: `Restored note '${safeRestoredNote.title}'`
        });
      } catch (error) {
        logActivityError(error, `restore note ${restoredNoteData.id}`);
        throw error;
      }
    },
    [createActivity, logActivityError]
  );

  const addReminderToNote = useCallback(async (noteId: string, reminderId: string): Promise<Note> => {
    try {
      const updatedNote = await notesService.linkReminder(noteId, reminderId);
      setNotes(prevNotes => prevNotes.map(n => (n.id === noteId ? createSafeNote(updatedNote) : n)));
      createActivity({
        actionType: 'add_reminder_to_note',
        itemType: 'note',
        itemId: noteId,
        itemTitle: updatedNote.title,
        description: `Added reminder to note '${updatedNote.title}'`
      });
      return updatedNote;
    } catch (err) {
      logActivityError(err, `add reminder to note ${noteId}`);
      throw err;
    }
  }, [createActivity, logActivityError]);

  const removeReminderFromNote = useCallback(async (noteId: string, reminderId: string): Promise<Note> => {
    try {
      const updatedNote = await notesService.unlinkReminder(noteId, reminderId);
      setNotes(prevNotes => prevNotes.map(n => (n.id === noteId ? createSafeNote(updatedNote) : n)));
      createActivity({
        actionType: 'remove_reminder_from_note',
        itemType: 'note',
        itemId: noteId,
        itemTitle: updatedNote.title,
        description: `Removed reminder from note '${updatedNote.title}'`
      });
      return updatedNote;
    } catch (err) {
      logActivityError(err, `remove reminder from note ${noteId}`);
      throw err;
    }
  }, [createActivity, logActivityError]);

  const duplicateNote = useCallback(async (noteId: string): Promise<Note> => {
    try {
      const newNote = await notesService.duplicateNote(noteId);
      const safeNewNote = createSafeNote(newNote);
      setNotes(prev => sortNotes([...prev, safeNewNote]));
      createActivity({
        actionType: 'duplicate',
        itemType: 'note',
        itemId: safeNewNote.id,
        itemTitle: safeNewNote.title,
        description: `Duplicated note '${safeNewNote.title}' from note ID ${noteId}`,
      });
      return safeNewNote;
    } catch (error) {
      logActivityError(error, `duplicate note ${noteId}`);
      throw error;
    }
  }, [createActivity, logActivityError]);

  const duplicateNotes = useCallback(
    async (noteIds: string[]): Promise<Note[]> => {
      const duplicatedNotes: Note[] = [];
      for (const noteId of noteIds) {
        try {
          const newNote = await duplicateNote(noteId); // Uses the already defined duplicateNote
          duplicatedNotes.push(newNote);
        } catch (error) {
          logActivityError(error, `duplicate note ${noteId} in batch`);
          // Optionally, collect errors and report them
        }
      }
      return duplicatedNotes;
    },
    [duplicateNote, logActivityError] // Ensure duplicateNote is in dependency array
  );

  // TickTick Integration specific logic

  const fetchTickTickNotes = useCallback(async () => {
    if (!user || !isTickTickConnected) return;
    setIsTickTickLoading(true);
    setTickTickError(null);
    try {
      const fetchedTickTickNotes = await integrationsService.getTickTickTasks(tickTickProjectId);
      setTickTickNotes(fetchedTickTickNotes);
    } catch (error: unknown) {
      console.error('Failed to fetch TickTick notes:', error);
      let message = "Failed to load TickTick notes.";
      if (error instanceof Error) {
        message = error.message;
      }
      setTickTickError(message);
    } finally {
      setIsTickTickLoading(false);
    }
  }, [user, isTickTickConnected, tickTickProjectId]);

  const checkTickTickStatus = useCallback(async (forceCheck: boolean = false) => {
    try {
      if (isTickTickConnected && !forceCheck && localStorage.getItem('ticktick_connected') === 'true') {
        return;
      }
      const status = await integrationsService.getTickTickStatus(isTickTickConnected);
      if (status.isConnected !== isTickTickConnected || forceCheck) {
        setIsTickTickConnected(status.isConnected);
        if (status.isConnected) {
          // If just connected, fetch notes and project ID
          const storedProjectId = localStorage.getItem('ticktick_notes_project_id') || '';
          setTickTickProjectId(storedProjectId); // Ensure project ID is set before fetching
          if (storedProjectId) { // Only fetch if a project ID is set
            await fetchTickTickNotes();
          }
        } else {
          setTickTickNotes([]); // Clear TickTick notes if disconnected
        }
      }
    } catch (error) {
      logActivityError(error, 'Failed to check TickTick connection status');
      setIsTickTickConnected(false); // Assume disconnected on error
    }
  }, [fetchTickTickNotes, logActivityError, isTickTickConnected]);

  useEffect(() => {
    if (user) {
      checkTickTickStatus(true); // Force check on user load
      const handleReconnect = () => {
        setTimeout(() => checkTickTickStatus(true), 1000);
      };
      window.addEventListener('signalr:reconnected', handleReconnect);
      return () => {
        window.removeEventListener('signalr:reconnected', handleReconnect);
      };
    }
  }, [user, checkTickTickStatus]);

  const updateTickTickProjectId = useCallback(async (projectId: string) => {
    setTickTickProjectId(projectId);
    if (projectId && isTickTickConnected) {
      await fetchTickTickNotes(); // Refetch notes for the new project
    } else if (!projectId) {
      setTickTickNotes([]); // Clear notes if no project is selected
    }
  }, [isTickTickConnected, fetchTickTickNotes]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  useEffect(() => {
    if (isTickTickConnected && tickTickProjectId) {
      fetchTickTickNotes();
    } else if (isTickTickConnected && !tickTickProjectId) {
      // If connected but no project ID, clear notes or prompt user
      setTickTickNotes([]);
    }
  }, [isTickTickConnected, tickTickProjectId, fetchTickTickNotes]);

  const getTickTickNote = useCallback(async (projectIdParam: string, noteId: string): Promise<TickTickTask | null> => {
    try {
      const note = await integrationsService.getTickTickTask(projectIdParam, noteId);
      return note;
    } catch (error) {
      logActivityError(error, `fetch TickTick note ${noteId}`);
      return null;
    }
  }, [logActivityError]);

  const updateTickTickNote = useCallback(async (noteId: string, note: Partial<TickTickTask> & { id: string; projectId: string }): Promise<TickTickTask | null> => {
    try {
      const updatedNote = await integrationsService.updateTickTickTask(noteId, note);
      await fetchTickTickNotes(); // Refresh the list
      return updatedNote;
    } catch (error) {
      logActivityError(error, `update TickTick note ${noteId}`);
      return null;
    }
  }, [fetchTickTickNotes, logActivityError]);

  const deleteTickTickNote = useCallback(async (projectIdParam: string, noteId: string): Promise<boolean> => {
    try {
      await integrationsService.deleteTickTickTask(projectIdParam, noteId);
      await fetchTickTickNotes(); // Refresh the list
      return true;
    } catch (error) {
      logActivityError(error, `delete TickTick note ${noteId}`);
      return false;
    }
  }, [fetchTickTickNotes, logActivityError]);

  const createTickTickNote = useCallback(async (projectIdParam: string, noteData: Partial<TickTickTask>): Promise<TickTickTask | null> => {
    try {
      const newNote = await integrationsService.createTickTickTask(projectIdParam, noteData);
      await fetchTickTickNotes(); // Refresh the list
      return newNote;
    } catch (error) {
      logActivityError(error, `create TickTick note`);
      return null;
    }
  }, [fetchTickTickNotes, logActivityError]);

  // TickTick Sync Methods
  const getSyncStatus = useCallback(async () => {
    try {
      const status = await integrationsService.getTickTickSyncStatus(tickTickProjectId, 'notes'); // Added projectId and syncType
      setSyncTaskCount({
        local: status.taskCount.local, // Corrected
        tickTick: status.taskCount.tickTick, // Corrected
        mapped: status.taskCount.mapped // Corrected
      });
      // lastSynced is updated by syncWithTickTick
      return {
        lastSynced: lastSynced || localStorage.getItem('last_ticktick_sync_time'),
        taskCount: {
          local: status.taskCount.local, // Corrected
          tickTick: status.taskCount.tickTick, // Corrected
          mapped: status.taskCount.mapped // Corrected
        }
      };
    } catch (error) {
      logActivityError(error, 'get TickTick sync status');
      throw error;
    }
  }, [lastSynced, logActivityError, tickTickProjectId]);

  const syncWithTickTick = useCallback(async (config: SyncConfig): Promise<SyncResult> => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Ensure syncType is 'notes' for this context
      const notesSyncConfig: SyncConfig = { ...config, syncType: 'notes' };
      const result = await integrationsService.syncTickTickTasks(notesSyncConfig); // Changed to syncTickTickTasks
      setLastSynced(new Date().toISOString());
      localStorage.setItem('last_ticktick_sync_time', new Date().toISOString());
      await fetchNotes();
      await fetchTickTickNotes();
      await getSyncStatus();
      createActivity({
        actionType: 'sync',
        itemType: 'ticktick_notes',
        itemId: 'ticktick_sync',
        itemTitle: 'TickTick Sync',
        description: `Synced ${result.created + result.updated} notes with TickTick. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.errors}`,
      });
      return result;
    } catch (error) {
      logActivityError(error, 'sync with TickTick');
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchNotes, fetchTickTickNotes, getSyncStatus, createActivity, logActivityError]);

  const resetSyncData = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await integrationsService.resetSyncData(); // Changed to resetSyncData
      setLastSynced(null);
      localStorage.removeItem('last_ticktick_sync_time');
      await getSyncStatus(); // This will use the updated projectId and syncType
      await fetchNotes();
      await fetchTickTickNotes();
      createActivity({
        actionType: 'reset_sync',
        itemType: 'ticktick_notes',
        itemId: 'ticktick_reset',
        itemTitle: 'TickTick Reset Sync',
        description: 'Reset TickTick notes synchronization data.',
      });
      return true;
    } catch (error) {
      logActivityError(error, 'reset TickTick sync data');
      setSyncError(error instanceof Error ? error.message : 'Unknown reset error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchNotes, fetchTickTickNotes, getSyncStatus, createActivity, logActivityError]);

  const contextValue = useMemo(
    () => ({
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
      clearArchivedNotes,
      restoreMultipleNotes,
      restoreNote,
      fetchNotes,
      addReminderToNote,
      removeReminderFromNote,
      duplicateNote,
      duplicateNotes,
      // TickTick specific state and functions
      tickTickNotes,
      isTickTickLoading,
      tickTickError,
      fetchTickTickNotes,
      isTickTickConnected,
      refreshTickTickConnection: checkTickTickStatus,
      tickTickProjectId,
      updateTickTickProjectId,
      getTickTickNote,
      updateTickTickNote,
      deleteTickTickNote,
      createTickTickNote,
      syncWithTickTick,
      getSyncStatus,
      resetSyncData,
      isSyncing,
      syncError,
      lastSynced,
      syncTaskCount
    }),
    [
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
      clearArchivedNotes,
      restoreMultipleNotes,
      restoreNote,
      fetchNotes,
      addReminderToNote,
      removeReminderFromNote,
      duplicateNote,
      duplicateNotes,
      // TickTick dependencies
      tickTickNotes,
      isTickTickLoading,
      tickTickError,
      fetchTickTickNotes,
      isTickTickConnected,
      checkTickTickStatus,
      tickTickProjectId,
      updateTickTickProjectId,
      getTickTickNote,
      updateTickTickNote,
      deleteTickTickNote,
      createTickTickNote,
      syncWithTickTick,
      getSyncStatus,
      resetSyncData,
      isSyncing,
      syncError,
      lastSynced,
      syncTaskCount
    ]
  );

  return <NotesContext.Provider value={contextValue}>{children}</NotesContext.Provider>;
}

export function NotesWithRemindersProvider({ children }: { children: React.ReactNode }) {
  return <NotesProvider>{children}</NotesProvider>;
}