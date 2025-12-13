import { useQueryClient } from '@tanstack/react-query';
import { notesService, type GetNotesPagedParams } from '../../../services';
import { Note, NoteListItem, CreateNoteRequest, UpdateNoteRequest, GenerateSummariesResponse } from '../../../types/notes';
import type { PaginatedResult } from '../../../types/api';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { NOTES_FOLDERS } from '../../../lib/constants';
import { noteKeys, type NotePaginationParams } from '../../../lib/query-keys';

// Type aliases for backward compatibility
type CreateNoteInput = CreateNoteRequest;
type UpdateNoteInput = UpdateNoteRequest;

// Re-export query keys for backward compatibility
export { noteKeys };

/**
 * Query: Get all notes (lightweight list with summaries)
 * Returns NoteListItem[] - contains summary instead of full content for better performance
 */
export function useNotes() {
  return useApiQuery<NoteListItem[]>(
    noteKeys.all,
    () => notesService.getAll()
  );
}

/**
 * Query: Get paginated notes with server-side filtering
 * Use this instead of useNotes() when dealing with large note collections.
 * This enables server-side pagination, filtering, and search for better performance.
 *
 * @param params - Pagination and filter parameters
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Paginated result with notes and pagination metadata
 */
export function useNotesPaged(
  params: GetNotesPagedParams,
  enabled = true
) {
  const queryParams: NotePaginationParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    folder: params.folder ?? undefined,
    includeArchived: params.includeArchived,
    search: params.search,
  };

  return useApiQuery<PaginatedResult<NoteListItem>>(
    noteKeys.paged(queryParams),
    () => notesService.getPaged(params),
    {
      enabled,
      // Keep previous data while fetching new page for smoother UX
      placeholderData: (previousData) => previousData,
    }
  );
}

// Query: Get note by ID
export function useNote(id: string) {
  return useConditionalQuery<Note>(
    !!id,
    noteKeys.detail(id),
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
      invalidateQueries: [noteKeys.all],
      optimisticUpdate: {
        queryKey: noteKeys.all,
        getOptimisticData: (newNote, currentData) => {
          const notes = (currentData as NoteListItem[] | undefined) ?? [];
          // Create optimistic NoteListItem (without content, just the list fields)
          const optimisticNote: NoteListItem = {
            id: `temp-${Date.now()}`,
            title: newNote.title,
            tags: newNote.tags,
            isArchived: newNote.isArchived,
            folder: newNote.folder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Summary will be null until the server generates it
            summary: undefined,
          };
          return [optimisticNote, ...notes];
        },
      },
    }
  );
}

// Context type for update note mutation
interface UpdateNoteContext {
  previousNotes?: NoteListItem[];
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
        await queryClient.cancelQueries({ queryKey: noteKeys.all });
        await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.all);
        const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(id));

        // Optimistically update notes list
        if (previousNotes) {
          queryClient.setQueryData<NoteListItem[]>(
            noteKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, ...data, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(noteKeys.detail(id), {
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
          queryClient.setQueryData(noteKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, { id }) => {
        // Refetch to ensure consistency
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
        void queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
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
      invalidateQueries: [noteKeys.all],
      optimisticUpdate: {
        queryKey: noteKeys.all,
        getOptimisticData: (id, currentData) => {
          const notes = (currentData as NoteListItem[] | undefined) ?? [];
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
      invalidateQueries: [noteKeys.all],
      optimisticUpdate: {
        queryKey: noteKeys.all,
        getOptimisticData: (noteIds, currentData) => {
          const notes = (currentData as NoteListItem[] | undefined) ?? [];
          return notes.filter((note) => !noteIds.includes(note.id));
        },
      },
    }
  );
}

// Context type for archive/unarchive mutations
interface ArchiveNoteContext {
  previousNotes?: NoteListItem[];
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
        await queryClient.cancelQueries({ queryKey: noteKeys.all });
        await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.all);
        const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(id));

        // Optimistically update notes list (set isArchived and move to Archived folder)
        if (previousNotes) {
          queryClient.setQueryData<NoteListItem[]>(
            noteKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, isArchived: true, folder: NOTES_FOLDERS.ARCHIVED, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(noteKeys.detail(id), {
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
          queryClient.setQueryData(noteKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, id) => {
        // Refetch to ensure consistency
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
        void queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
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
        await queryClient.cancelQueries({ queryKey: noteKeys.all });
        await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.all);
        const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(id));

        // Optimistically update notes list (set isArchived to false and remove from Archived folder)
        if (previousNotes) {
          queryClient.setQueryData<NoteListItem[]>(
            noteKeys.all,
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
          queryClient.setQueryData<Note>(noteKeys.detail(id), {
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
          queryClient.setQueryData(noteKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, id) => {
        // Refetch to ensure consistency
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
        void queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      },
    }
  );
}

// Context type for move to folder mutation
interface MoveToFolderContext {
  previousNotes?: NoteListItem[];
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
        await queryClient.cancelQueries({ queryKey: noteKeys.all });
        await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

        // Snapshot previous values
        const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.all);
        const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(id));

        // Optimistically update notes list
        if (previousNotes) {
          queryClient.setQueryData<NoteListItem[]>(
            noteKeys.all,
            previousNotes.map((note) =>
              note.id === id
                ? { ...note, folder: folder || undefined, updatedAt: new Date().toISOString() }
                : note
            )
          );
        }

        // Optimistically update single note
        if (previousNote) {
          queryClient.setQueryData<Note>(noteKeys.detail(id), {
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
          queryClient.setQueryData(noteKeys.all, context.previousNotes);
        }
        if (context?.previousNote) {
          queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
        }
      },
      onSettled: (_data, _error, { id }) => {
        // Refetch to ensure consistency
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
        void queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      },
    }
  );
}

// Mutation: Generate summaries for notes
export function useGenerateSummaries() {
  return useApiMutation<GenerateSummariesResponse, string[]>(
    (noteIds) => notesService.generateSummaries(noteIds),
    {
      errorMessage: 'Failed to generate summaries',
      invalidateQueries: [noteKeys.all],
    }
  );
}

