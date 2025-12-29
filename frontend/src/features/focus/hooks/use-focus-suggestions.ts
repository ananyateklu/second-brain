/**
 * Focus Suggestions Hook
 * TanStack Query hook for managing persisted AI focus suggestions
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '../../../hooks/use-api-query';
import { focusKeys } from '../../../lib/query-keys';
import { focusService } from '../../../services/focus.service';
import type { PersistedFocusSuggestion, GenerateSuggestionsResponse } from '../types';

/**
 * Sort suggestions by priority (P1 first) then by newest within each priority
 */
function sortSuggestions(suggestions: PersistedFocusSuggestion[]): PersistedFocusSuggestion[] {
  return [...suggestions].sort((a, b) => {
    // First sort by priority (ascending: P1=1 comes first)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then sort by createdAt (descending: newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Hook options for focus suggestions query
 */
export interface UseFocusSuggestionsOptions {
  /** Whether to include already accepted suggestions */
  includeAccepted?: boolean;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook to manage persisted AI focus suggestions
 * Uses database-backed persistence with vector similarity deduplication
 *
 * @param options - Query options
 * @returns Query result with persisted suggestions and mutations
 *
 * @example
 * ```tsx
 * const {
 *   suggestions,
 *   isLoading,
 *   generateSuggestions,
 *   deleteSuggestion,
 *   lastGenerationStats,
 * } = useFocusSuggestions();
 *
 * // Generate new suggestions
 * await generateSuggestions.mutateAsync({ currentFocusTitle: 'Working on auth' });
 *
 * // Show stats
 * console.log(`Added ${lastGenerationStats?.newSuggestionsAdded} new suggestions`);
 * ```
 */
export function useFocusSuggestions(options?: UseFocusSuggestionsOptions) {
  const { includeAccepted = false, enabled = true } = options ?? {};
  const queryClient = useQueryClient();

  // Fetch persisted suggestions from database
  const query = useApiQuery<PersistedFocusSuggestion[]>(
    focusKeys.persistedSuggestions(includeAccepted),
    () => focusService.getSuggestions(includeAccepted),
    {
      enabled,
      // Suggestions are persistent, but refetch periodically to stay in sync
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Generate new suggestions mutation
  const generateMutation = useMutation({
    mutationFn: (params: { currentFocusTitle?: string }) =>
      focusService.generateSuggestions(params.currentFocusTitle),
    onSuccess: (data: GenerateSuggestionsResponse) => {
      // Update the suggestions cache with the new list
      queryClient.setQueryData<PersistedFocusSuggestion[]>(
        focusKeys.persistedSuggestions(includeAccepted),
        data.allSuggestions.filter(s => includeAccepted || !s.isAccepted)
      );
    },
  });

  // Delete suggestion mutation
  const deleteMutation = useMutation({
    mutationFn: (suggestionId: string) =>
      focusService.deleteSuggestion(suggestionId),
    onSuccess: (_, deletedId) => {
      // Optimistically remove from cache
      queryClient.setQueryData<PersistedFocusSuggestion[]>(
        focusKeys.persistedSuggestions(includeAccepted),
        (old) => old?.filter(s => s.id !== deletedId) ?? []
      );
    },
  });

  // Accept suggestion mutation (mark as converted to FocusItem)
  const acceptMutation = useMutation({
    mutationFn: ({ suggestionId, focusItemId }: { suggestionId: string; focusItemId: string }) =>
      focusService.acceptSuggestion(suggestionId, focusItemId),
    onSuccess: (updated) => {
      // Update the suggestion in cache to mark as accepted
      queryClient.setQueryData<PersistedFocusSuggestion[]>(
        focusKeys.persistedSuggestions(includeAccepted),
        (old) => {
          if (!old) return [];
          if (includeAccepted) {
            // Replace the suggestion with updated version
            return old.map(s => s.id === updated.id ? updated : s);
          } else {
            // Remove accepted suggestions if not including them
            return old.filter(s => s.id !== updated.id);
          }
        }
      );
      // Invalidate focus items queries to show the new item
      void queryClient.invalidateQueries({ queryKey: focusKeys.todayPlan() });
      void queryClient.invalidateQueries({ queryKey: focusKeys.backlog() });
    },
  });

  // Sort suggestions by priority (P1 first), then by newest
  const sortedSuggestions = useMemo(
    () => sortSuggestions(query.data ?? []),
    [query.data]
  );

  return {
    /** List of persisted suggestions (sorted by priority, then newest) */
    suggestions: sortedSuggestions,
    /** Whether the query is loading */
    isLoading: query.isLoading,
    /** Whether data is being fetched (includes background refetch) */
    isFetching: query.isFetching,
    /** Error if the query failed */
    error: query.error,
    /** Function to manually refetch */
    refetch: query.refetch,
    /** Whether this is the first load */
    isInitialLoading: query.isLoading && !query.data,

    // Generation
    /** Generate new suggestions (deduplicates against existing) */
    generateSuggestions: generateMutation,
    /** Whether generation is in progress */
    isGenerating: generateMutation.isPending,
    /** Last generation response (includes stats) */
    lastGenerationStats: generateMutation.data
      ? {
          newSuggestionsAdded: generateMutation.data.newSuggestionsAdded,
          duplicatesSkipped: generateMutation.data.duplicatesSkipped,
          context: generateMutation.data.context,
          generatedAt: generateMutation.data.generatedAt,
        }
      : null,

    // Delete
    /** Delete a suggestion */
    deleteSuggestion: deleteMutation,
    /** Whether deletion is in progress */
    isDeleting: deleteMutation.isPending,

    // Accept
    /** Accept a suggestion (mark as converted to FocusItem) */
    acceptSuggestion: acceptMutation,
    /** Whether acceptance is in progress */
    isAccepting: acceptMutation.isPending,
  };
}

export default useFocusSuggestions;
