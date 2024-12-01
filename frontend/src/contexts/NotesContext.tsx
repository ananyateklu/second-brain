import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useActivities } from './ActivityContext';
import { notesService, type UpdateNoteData } from '../services/api/notes.service';
import { useTrash } from './TrashContext';
import { useAuth } from './AuthContext';
import { sortNotes } from '../utils/noteUtils';
import type { Note } from '../types/note';

export type { Note };

interface NotesContextType {
  notes: Note[];
  archivedNotes: Note[];
  isLoading: boolean;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks'>) => void;
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

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}

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

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNoteIds' | 'linkedNotes' | 'linkedTasks'>) => {
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
        isDeleted: false,
        linkedTasks: Array.isArray(newNote.linkedTasks) ? newNote.linkedTasks : []
      };

      setNotes(prev => sortNotes([safeNewNote, ...prev]));

      try {
        if (createActivity) {
          createActivity({
            actionType: 'create',
            itemType: safeNewNote.isIdea ? 'idea' : 'note',
            itemId: safeNewNote.id,
            itemTitle: safeNewNote.title,
            description: `Created ${safeNewNote.isIdea ? 'idea' : 'note'}: ${safeNewNote.title}`,
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
      
      // Get the current note to preserve its links
      const currentNote = notes.find(n => n.id === id);
      if (!currentNote) {
        throw new Error('Note not found');
      }

      const updatedNote = await notesService.updateNote(id, updates);
      const safeUpdatedNote: Note = {
        ...updatedNote,
        isArchived: false,
        isDeleted: false,
        tags: Array.isArray(updatedNote.tags) ? updatedNote.tags : [],
        // Preserve the existing links
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

      try {
        if (createActivity) {
          createActivity({
            actionType: 'edit',
            itemType: updatedNote.isIdea ? 'idea' : 'note',
            itemId: id,
            itemTitle: updatedNote.title,
            description: `Updated ${updatedNote.isIdea ? 'idea' : 'note'}: ${updatedNote.title}`,
            metadata: {
              ...updates
            }
          });
        }
      } catch (activityError) {
        console.error('Failed to add activity for note update:', activityError);
      }

      return safeUpdatedNote;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }, [createActivity, notes]);

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

  const addLink = useCallback(async (sourceId: string, targetId: string) => {
    try {
      const linkResponse = await notesService.addLink(sourceId, targetId);
      const { sourceNote, targetNote } = linkResponse;

      setNotes(prev => {
        return prev.map(note => {
          if (note.id === sourceId) {
            return {
              ...note,
              linkedNoteIds: sourceNote.linkedNoteIds,
              linkedNotes: prev.filter(n => sourceNote.linkedNoteIds.includes(n.id))
            };
          }
          if (note.id === targetId) {
            return {
              ...note,
              linkedNoteIds: targetNote.linkedNoteIds,
              linkedNotes: prev.filter(n => targetNote.linkedNoteIds.includes(n.id))
            };
          }
          return note;
        });
      });

      // Add activity
      const sourceNoteData = notes.find(n => n.id === sourceId);
      const targetNoteData = notes.find(n => n.id === targetId);
      
      if (sourceNoteData && targetNoteData) {
        createActivity({
          actionType: 'link',
          itemType: 'note',
          itemId: sourceId,
          itemTitle: sourceNoteData.title,
          description: `Linked notes: ${sourceNoteData.title} ↔ ${targetNoteData.title}`,
          metadata: {
            sourceNoteId: sourceId,
            targetNoteId: targetId,
            sourceNoteTitle: sourceNoteData.title,
            targetNoteTitle: targetNoteData.title
          }
        });
      }
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

      setNotes(prev => {
        const updatedNotes = prev.map(note => {
          if (note.id === sourceId || note.id === targetId) {
            const otherNoteId = note.id === sourceId ? targetId : sourceId;
            return {
              ...note,
              linkedNoteIds: note.linkedNoteIds.filter(id => id !== otherNoteId),
              linkedNotes: (note.linkedNotes || []).filter(n => n.id !== otherNoteId)
            };
          }
          return note;
        });
        return sortNotes(updatedNotes);
      });

      const sourceNote = notes.find(n => n.id === sourceId);
      const targetNote = notes.find(n => n.id === targetId);

      if (sourceNote && targetNote) {
        createActivity({
          actionType: 'unlink',
          itemType: 'note',
          itemId: sourceId,
          itemTitle: sourceNote.title,
          description: `Unlinked notes: ${sourceNote.title} ↮ ${targetNote.title}`,
          metadata: {
            sourceNoteId: sourceId,
            targetNoteId: targetId,
            sourceNoteTitle: sourceNote.title,
            targetNoteTitle: targetNote.title
          }
        });
      }
    } catch (error) {
      console.error('Failed to remove link:', error);
      throw error;
    }
  }, [notes, createActivity]);

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
      {children}
    </NotesContext.Provider>
  );
}