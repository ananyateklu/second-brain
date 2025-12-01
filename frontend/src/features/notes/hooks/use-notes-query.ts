import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesService } from '../../../services';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../../../types/notes';
import { toast } from '../../../hooks/use-toast';
import { QUERY_KEYS, NOTES_FOLDERS } from '../../../lib/constants';

// Type aliases for backward compatibility
type CreateNoteInput = CreateNoteRequest;
type UpdateNoteInput = UpdateNoteRequest;

// Re-export query keys for backward compatibility
export const notesKeys = QUERY_KEYS.notes;

// Query: Get all notes
export function useNotes() {
  return useQuery({
    queryKey: notesKeys.all,
    queryFn: notesService.getAll,
  });
}

// Query: Get note by ID
export function useNote(id: string) {
  return useQuery({
    queryKey: notesKeys.detail(id),
    queryFn: () => notesService.getById(id),
    enabled: !!id,
  });
}

// Mutation: Create note
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: CreateNoteInput) => notesService.create(note),
    onMutate: async (newNote) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notesKeys.all });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);

      // Optimistically update
      if (previousNotes) {
        const optimisticNote: Note = {
          id: `temp-${Date.now()}`,
          ...newNote,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Note[]>(notesKeys.all, [optimisticNote, ...previousNotes]);
      }

      return { previousNotes };
    },
    onSuccess: () => {
      toast.success('Note created successfully');
    },
    onError: (error, _newNote, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      toast.error('Failed to create note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
    },
  });
}

// Mutation: Update note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) => notesService.update(id, data),
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
    onSuccess: () => {
      toast.success('Note updated successfully');
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
      }
      toast.error('Failed to update note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: (_data, _error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
    },
  });
}

// Mutation: Delete note
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesService.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notesKeys.all });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);

      // Optimistically update
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          notesKeys.all,
          previousNotes.filter((note) => note.id !== id)
        );
      }

      return { previousNotes };
    },
    onSuccess: () => {
      toast.success('Note deleted successfully');
    },
    onError: (error, _id, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      toast.error('Failed to delete note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
    },
  });
}

// Mutation: Bulk delete notes
export function useBulkDeleteNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteIds: string[]) => notesService.bulkDelete(noteIds),
    onMutate: async (noteIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notesKeys.all });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<Note[]>(notesKeys.all);

      // Optimistically update
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          notesKeys.all,
          previousNotes.filter((note) => !noteIds.includes(note.id))
        );
      }

      return { previousNotes };
    },
    onError: (_error, _noteIds, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
    },
  });
}

// Mutation: Archive note
export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesService.archive(id),
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
    onSuccess: () => {
      toast.success('Note archived');
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
      }
      toast.error('Failed to archive note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: (_data, _error, id) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
    },
  });
}

// Mutation: Unarchive note
export function useUnarchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesService.unarchive(id),
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
    onSuccess: () => {
      toast.success('Note restored from archive');
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
      }
      toast.error('Failed to restore note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: (_data, _error, id) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
    },
  });
}

// Mutation: Move note to folder
export function useMoveToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) =>
      notesService.update(id, { folder: folder || undefined, updateFolder: true }),
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
    onSuccess: (_data, { folder }) => {
      toast.success(folder ? `Moved to folder "${folder}"` : 'Removed from folder');
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(notesKeys.all, context.previousNotes);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(notesKeys.detail(id), context.previousNote);
      }
      toast.error('Failed to move note', error instanceof Error ? error.message : 'Unknown error');
    },
    onSettled: (_data, _error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notesKeys.all });
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(id) });
    },
  });
}

