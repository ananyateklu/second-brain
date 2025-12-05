/**
 * Note Version History Hooks
 * React Query hooks for PostgreSQL 18 temporal table features
 */

import { useQueryClient } from '@tanstack/react-query';
import { notesService } from '../../../services';
import type {
  NoteVersionHistory,
  NoteVersion,
  NoteVersionDiff,
  RestoreVersionResponse,
} from '../../../types/notes';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { noteVersionKeys, noteKeys } from '../../../lib/query-keys';

// Re-export query keys for convenience
export { noteVersionKeys };

/**
 * Hook to fetch version history for a note
 * @param noteId - The note ID to get version history for
 * @param enabled - Whether to enable the query (default: true when noteId is provided)
 */
export function useNoteVersionHistory(noteId: string, enabled = true) {
  return useConditionalQuery<NoteVersionHistory>(
    !!noteId && enabled,
    noteVersionKeys.history(noteId),
    () => notesService.getVersionHistory(noteId)
  );
}

/**
 * Hook to fetch a note's state at a specific point in time
 * @param noteId - The note ID
 * @param timestamp - ISO timestamp to retrieve version at
 * @param enabled - Whether to enable the query
 */
export function useNoteVersionAtTime(
  noteId: string,
  timestamp: string,
  enabled = true
) {
  return useConditionalQuery<NoteVersion>(
    !!noteId && !!timestamp && enabled,
    noteVersionKeys.atTime(noteId, timestamp),
    () => notesService.getVersionAtTime(noteId, timestamp)
  );
}

/**
 * Hook to compare two versions of a note
 * @param noteId - The note ID
 * @param fromVersion - Earlier version number
 * @param toVersion - Later version number
 * @param enabled - Whether to enable the query
 */
export function useNoteVersionDiff(
  noteId: string,
  fromVersion: number,
  toVersion: number,
  enabled = true
) {
  return useConditionalQuery<NoteVersionDiff>(
    !!noteId && fromVersion > 0 && toVersion > 0 && fromVersion !== toVersion && enabled,
    noteVersionKeys.diff(noteId, fromVersion, toVersion),
    () => notesService.getVersionDiff(noteId, fromVersion, toVersion)
  );
}

/**
 * Context type for restore version mutation
 */
interface RestoreVersionContext {
  previousHistory?: NoteVersionHistory;
}

/**
 * Hook to restore a note to a previous version
 * Creates a new version with the content from the target version
 */
export function useRestoreNoteVersion() {
  const queryClient = useQueryClient();

  return useApiMutation<
    RestoreVersionResponse,
    { noteId: string; targetVersion: number },
    RestoreVersionContext
  >(
    ({ noteId, targetVersion }) => notesService.restoreVersion(noteId, targetVersion),
    {
      successMessage: (data) => data.message || 'Note restored successfully',
      showSuccessToast: true,
      errorMessage: 'Failed to restore note version',
      onMutate: async ({ noteId }) => {
        // Cancel outgoing refetches for this note's version history
        await queryClient.cancelQueries({ queryKey: noteVersionKeys.history(noteId) });

        // Snapshot previous values
        const previousHistory = queryClient.getQueryData<NoteVersionHistory>(
          noteVersionKeys.history(noteId)
        );

        return { previousHistory };
      },
      onError: (_error, { noteId }, context) => {
        // Rollback on error
        if (context?.previousHistory) {
          queryClient.setQueryData(
            noteVersionKeys.history(noteId),
            context.previousHistory
          );
        }
      },
      onSettled: (_data, _error, { noteId }) => {
        // Invalidate related queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: noteVersionKeys.history(noteId) });
        queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
        queryClient.invalidateQueries({ queryKey: noteKeys.all });
      },
    }
  );
}

/**
 * Hook to prefetch version history (useful for optimistic loading)
 * @returns Function to prefetch version history
 */
export function usePrefetchVersionHistory() {
  const queryClient = useQueryClient();

  return (noteId: string) => {
    queryClient.prefetchQuery({
      queryKey: noteVersionKeys.history(noteId),
      queryFn: () => notesService.getVersionHistory(noteId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

/**
 * Hook to invalidate all version-related queries for a note
 * @returns Function to invalidate version queries
 */
export function useInvalidateVersionQueries() {
  const queryClient = useQueryClient();

  return (noteId: string) => {
    queryClient.invalidateQueries({ queryKey: noteVersionKeys.history(noteId) });
    // Also invalidate any diff queries for this note
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key[0] === 'noteVersions' &&
          key[1] === 'diff' &&
          key[2] === noteId
        );
      },
    });
  };
}
