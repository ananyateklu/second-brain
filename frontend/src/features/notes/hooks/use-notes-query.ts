import { useQueryClient } from '@tanstack/react-query';
import { notesService } from '../../../services';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../../../types/notes';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { QUERY_KEYS, NOTES_FOLDERS } from '../../../lib/constants';

// Type aliases for backward compatibility
type CreateNoteInput = CreateNoteRequest;
type UpdateNoteInput = UpdateNoteRequest;

// Re-export query keys for backward compatibility
export const notesKeys = QUERY_KEYS.notes;

// Query: Get all notes
export function useNotes() {
  return useApiQuery<Note[]>(
    notesKeys.all,
    notesService.getAll
  );
}

// Query: Get note by ID
export function useNote(id: string) {
  return useConditionalQuery<Note>(
    !!id,
    notesKeys.detail(id),
    () => notesService.getById(id)
  );
}

// Mutation: Create note
export function useCreateNote() {
  return useApiMutation<Note, CreateNoteInput>(
    (note) => notesService.create(note),
    {
      successMessage: 'Note created successfully',
      showSuccessToast: true,
      errorMessage: 'Failed to create note',
      invalidateQueries: [notesKeys.all],
      optimisticUpdate: {
        queryKey: notesKeys.all,
        getOptimisticData: (newNote, currentData) => {
          const notes = (currentData as Note[] | undefined) ?? [];
          const optimisticNote: Note = {
            id: `temp-${Date.now()}`,
            ...newNote,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [optimisticNote, ...notes];
        },
      },
    }
  );
}

// Context type for update note mutation
interface UpdateNoteContext {
  previousNotes?: Note[];
  previousNote?: Note;
}

// Mutation: Update note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useApiMutation<Note, { id: string; data: UpdateNoteInput }, UpdateNoteContext>(
    ({ id, data }) => notesService.update(id, data),
    {
      successMessage: 'Note updated successfully',
      showSuccessToast: true,
      errorMessage: 'Failed to update note',
      onMutate: async ({ id, data }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: notesKeys.all });
        await queryClient.cancelQueries({ queryKey: notesKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);
        const previousNote = queryClient.getQueryData<Note>(notesKeys.detail(id));

        // Optimistically update notes list
        if (previousNotes) {
          queryClient.setQueryData<Note[]>(
            notesKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, ...data, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(notesKeys.detail(id), {
            ...previousNote,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }

        return { previousNotes, previousNote };
      },
      onError: (_error, { id }, context) => {
        // Rollback on error
        if (context?.previousNotes) {
          queryClient.setQueryData(notesKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, { id }) => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: notesKeys.all });
        queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
      },
    }
  );
}

// Mutation: Delete note
export function useDeleteNote() {
  return useApiMutation<void, string>(
    (id) => notesService.delete(id),
    {
      successMessage: 'Note deleted successfully',
      showSuccessToast: true,
      errorMessage: 'Failed to delete note',
      invalidateQueries: [notesKeys.all],
      optimisticUpdate: {
        queryKey: notesKeys.all,
        getOptimisticData: (id, currentData) => {
          const notes = (currentData as Note[] | undefined) ?? [];
          return notes.filter((note) => note.id !== id);
        },
      },
    }
  );
}

// Mutation: Bulk delete notes
export function useBulkDeleteNotes() {
  return useApiMutation<{ deletedCount: number; message: string }, string[]>(
    (noteIds) => notesService.bulkDelete(noteIds),
    {
      errorMessage: 'Failed to delete notes',
      invalidateQueries: [notesKeys.all],
      optimisticUpdate: {
        queryKey: notesKeys.all,
        getOptimisticData: (noteIds, currentData) => {
          const notes = (currentData as Note[] | undefined) ?? [];
          return notes.filter((note) => !noteIds.includes(note.id));
        },
      },
    }
  );
}

// Context type for archive/unarchive mutations
interface ArchiveNoteContext {
  previousNotes?: Note[];
  previousNote?: Note;
}

// Mutation: Archive note
export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useApiMutation<Note, string, ArchiveNoteContext>(
    (id) => notesService.archive(id),
    {
      successMessage: 'Note archived',
      showSuccessToast: true,
      errorMessage: 'Failed to archive note',
      onMutate: async (id) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: notesKeys.all });
        await queryClient.cancelQueries({ queryKey: notesKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);
        const previousNote = queryClient.getQueryData<Note>(notesKeys.detail(id));

        // Optimistically update notes list (set isArchived and move to Archived folder)
        if (previousNotes) {
          queryClient.setQueryData<Note[]>(
            notesKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, isArchived: true, folder: NOTES_FOLDERS.ARCHIVED, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(notesKeys.detail(id), {
            ...previousNote,
            isArchived: true,
            folder: NOTES_FOLDERS.ARCHIVED,
            updatedAt: new Date().toISOString(),
          });
        }

        return { previousNotes, previousNote };
      },
      onError: (_error, id, context) => {
        // Rollback on error
        if (context?.previousNotes) {
          queryClient.setQueryData(notesKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, id) => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: notesKeys.all });
        queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
      },
    }
  );
}

// Mutation: Unarchive note
export function useUnarchiveNote() {
  const queryClient = useQueryClient();

  return useApiMutation<Note, string, ArchiveNoteContext>(
    (id) => notesService.unarchive(id),
    {
      successMessage: 'Note restored from archive',
      showSuccessToast: true,
      errorMessage: 'Failed to restore note',
      onMutate: async (id) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: notesKeys.all });
        await queryClient.cancelQueries({ queryKey: notesKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);
        const previousNote = queryClient.getQueryData<Note>(notesKeys.detail(id));

        // Optimistically update notes list (set isArchived to false and remove from Archived folder)
        if (previousNotes) {
          queryClient.setQueryData<Note[]>(
            notesKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? {
                  ...note,
                  isArchived: false,
                  // Only remove folder if it was in the Archived folder
                  folder: note.folder === NOTES_FOLDERS.ARCHIVED ? undefined : note.folder,
                  updatedAt: new Date().toISOString()
                }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(notesKeys.detail(id), {
            ...previousNote,
            isArchived: false,
            // Only remove folder if it was in the Archived folder
            folder: previousNote.folder === NOTES_FOLDERS.ARCHIVED ? undefined : previousNote.folder,
            updatedAt: new Date().toISOString(),
          });
        }

        return { previousNotes, previousNote };
      },
      onError: (_error, id, context) => {
        // Rollback on error
        if (context?.previousNotes) {
          queryClient.setQueryData(notesKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, id) => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: notesKeys.all });
        queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
      },
    }
  );
}

// Context type for move to folder mutation
interface MoveToFolderContext {
  previousNotes?: Note[];
  previousNote?: Note;
}

// Mutation: Move note to folder
export function useMoveToFolder() {
  const queryClient = useQueryClient();

  return useApiMutation<Note, { id: string; folder: string | null }, MoveToFolderContext>(
    ({ id, folder }) => notesService.update(id, { folder: folder || undefined, updateFolder: true }),
    {
      successMessage: (_data, { folder }) => folder ? `Moved to folder "${folder}"` : 'Removed from folder',
      showSuccessToast: true,
      errorMessage: 'Failed to move note',
      onMutate: async ({ id, folder }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: notesKeys.all });
        await queryClient.cancelQueries({ queryKey: notesKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);
        const previousNote = queryClient.getQueryData<Note>(notesKeys.detail(id));

        // Optimistically update notes list
        if (previousNotes) {
          queryClient.setQueryData<Note[]>(
            notesKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, folder: folder || undefined, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(notesKeys.detail(id), {
            ...previousNote,
            folder: folder || undefined,
            updatedAt: new Date().toISOString(),
          });
        }

        return { previousNotes, previousNote };
      },
      onError: (_error, { id }, context) => {
        // Rollback on error
        if (context?.previousNotes) {
          queryClient.setQueryData(notesKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, { id }) => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: notesKeys.all });
        queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
      },
    }
  );
}

