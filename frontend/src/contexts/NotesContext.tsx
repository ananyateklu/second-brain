import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useActivities } from './ActivityContext';
import { notesService } from '../services/api/notes.service';
import { useTrash, TrashProvider } from './TrashContext';
import { useAuth } from './AuthContext';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds: string[];
  linkedNotes?: Note[];
}

interface NotesContextType {
  notes: Note[];
  archivedNotes: Note[];
  isLoading: boolean;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  togglePinNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => Promise<Note>;
  addLink: (sourceId: string, targetId: string) => void;
  removeLink: (sourceId: string, targetId: string) => void;
  loadArchivedNotes: () => Promise<void>;
  restoreMultipleNotes: (ids: string[]) => Promise<PromiseSettledResult<Note>[]>;
  restoreNote: (restoredNote: Note) => Promise<void>;
  fetchNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | null>(null);

interface NotesProviderProps {
  children: React.ReactNode;
}

export function NotesProvider({ children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createActivity } = useActivities();
  const { moveToTrash } = useTrash();
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    try {
      console.log('Fetching notes...');
      setIsLoading(true);
      const fetchedNotes = await notesService.getAllNotes();
      console.log('Fetched notes:', fetchedNotes);
      setNotes(fetchedNotes.filter(note => !note.isArchived && !note.isDeleted).map(note => ({
        ...note,
        isArchived: note.isArchived || false,
        isDeleted: note.isDeleted || false
      })));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching notes');
      fetchNotes();
    }
  }, [user, fetchNotes]);

  useEffect(() => {
    console.log('Notes updated:', notes);
  }, [notes]);

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes'>) => {
    try {
      const noteWithSafeTags = {
        ...note,
        tags: Array.isArray(note.tags) ? note.tags : [],
      };

      const newNote = await notesService.createNote(noteWithSafeTags);

      if (newNote.isDeleted || newNote.isArchived) {
        return;
      }

      const safeNewNote: Note = {
        ...newNote,
        tags: Array.isArray(newNote.tags) ? newNote.tags : [],
        linkedNoteIds: Array.isArray(newNote.linkedNoteIds) ? newNote.linkedNoteIds : [],
        isArchived: false,
        isDeleted: false
      };

      setNotes(prev => [safeNewNote, ...prev]);

      try {
        if (createActivity) {
          createActivity({
            actionType: 'create',
            itemType: safeNewNote.tags.includes('idea') ? 'idea' : 'note',
            itemId: safeNewNote.id,
            itemTitle: safeNewNote.title,
            description: `Created ${safeNewNote.tags.includes('idea') ? 'idea' : 'note'}: ${safeNewNote.title}`,
            metadata: {
              tags: safeNewNote.tags
            }
          });
        }
      } catch (activityError) {
        console.error('Failed to add activity:', activityError);
        // Don't throw the error since the note was still created successfully
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }, [createActivity]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      if (updates.isArchived !== undefined) {
        return;
      }
      const updatedNote = await notesService.updateNote(id, updates);
      const safeUpdatedNote: Note = {
        ...updatedNote,
        isArchived: false,
        isDeleted: false,
        tags: Array.isArray(updatedNote.tags) ? updatedNote.tags : [],
        linkedNoteIds: Array.isArray(updatedNote.linkedNoteIds) ? updatedNote.linkedNoteIds : []
      };

      setNotes(prevNotes =>
        prevNotes
          .map(note => (note.id === id ? safeUpdatedNote : note))
          .filter(note => !note.isDeleted && !note.isArchived)
      );

      try {
        if (createActivity) {
          createActivity({
            actionType: 'edit',
            itemType: updatedNote.tags.includes('idea') ? 'idea' : 'note',
            itemId: id,
            itemTitle: updatedNote.title,
            description: `Updated ${updatedNote.tags.includes('idea') ? 'idea' : 'note'}: ${updatedNote.title}`,
            metadata: {
              ...updates
            }
          });
        }
      } catch (activityError) {
        console.error('Failed to add activity for note update:', activityError);
        // Don't throw the error since the note was still updated successfully
      }

      return updatedNote;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }, [createActivity]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      const noteToDelete = notes.find(note => note.id === id);
      if (!noteToDelete) return;

      // Remove from notes list immediately
      setNotes(prev => prev.filter(note => note.id !== id));

      // Mark as deleted in backend
      await notesService.updateNote(id, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        title: noteToDelete.title,
        content: noteToDelete.content,
        tags: noteToDelete.tags,
        isFavorite: noteToDelete.isFavorite,
        linkedNoteIds: noteToDelete.linkedNoteIds
      });

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
  }, [notes, createActivity]);

  const archiveNote = useCallback(async (id: string) => {
    try {
      const noteToArchive = notes.find(n => n.id === id);
      if (!noteToArchive) return;

      await notesService.updateNote(id, {
        isArchived: true,
        archivedAt: new Date().toISOString()
      });

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

  const unarchiveNote = useCallback(async (id: string) => {
    try {
      const updatedNote = await notesService.unarchiveNote(id);
      const noteToUnarchive = archivedNotes.find(n => n.id === id);
      if (!noteToUnarchive) return;

      setNotes(prevNotes => [...prevNotes, { ...noteToUnarchive, ...updatedNote, isArchived: false }]);
      setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== id));

      createActivity({
        actionType: 'restore',
        itemType: noteToUnarchive.tags.includes('idea') ? 'idea' : 'note', 
        itemId: id,
        itemTitle: noteToUnarchive.title,
        description: `Restored ${noteToUnarchive.tags.includes('idea') ? 'idea' : 'note'}: ${noteToUnarchive.title}`,
        metadata: {
          isArchived: false,
          restoredAt: new Date().toISOString()
        }
      });

      return updatedNote;
    } catch (error) {
      console.error('Error unarchiving note:', error);
      throw error;
    }
  });

  // Add a method for restoring multiple notes
  const restoreMultipleNotes = useCallback(async (ids: string[]) => {
    try {
      const results = await Promise.allSettled(
        ids.map(id => unarchiveNote(id))
      );

      // Add activity for bulk restore
      if (results.length > 1) {
        const successfulRestores = results.filter(
          (result): result is PromiseSettledResult<Note | undefined> =>
            result.status === 'fulfilled'
        ) as PromiseFulfilledResult<Note | undefined>[];

        const restoredNotes = successfulRestores.map(result => result.value).filter((note): note is Note => note !== undefined);

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

  const addLink = useCallback(async (sourceId: string, targetId: string) => {
    try {
      const updatedNote = await notesService.addLink(sourceId, targetId);

      setNotes(prev => prev.map(note => {
        if (note.id === sourceId) {
          return {
            ...note,
            linkedNoteIds: updatedNote.linkedNoteIds,
            linkedNotes: prev.filter(n => updatedNote.linkedNoteIds.includes(n.id)),
            updatedAt: updatedNote.updatedAt
          };
        }
        if (note.id === targetId) {
          return {
            ...note,
            linkedNoteIds: [...(note.linkedNoteIds || []), sourceId],
            linkedNotes: [...(note.linkedNotes || []), prev.find(n => n.id === sourceId)!],
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      }));

      createActivity({
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
  }, [notes, createActivity]);

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
            ).map(id => prev.find(n => n.id === id)!),
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      }));

      const sourceNote = notes.find(n => n.id === sourceId);
      const targetNote = notes.find(n => n.id === targetId);

      createActivity({
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
  }, [notes, createActivity]);

  const loadArchivedNotes = useCallback(async () => {
    try {
      const fetchedArchivedNotes = await notesService.getArchivedNotes();
      setArchivedNotes(fetchedArchivedNotes);
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

  const contextValue = {
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
  };

  return (
    <NotesContext.Provider value={contextValue}>
      <TrashProvider onRestoreNote={restoreNote}>
        {children}
      </TrashProvider>
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