/**
 * Voice Session History Hooks
 * TanStack Query hooks for fetching voice session history and transcripts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voiceService } from '../../../services/voice.service';
import { voiceKeys } from '../../../lib/query-keys';
import type { VoiceSessionHistoryResponse, VoiceSessionDetail } from '../types/voice-types';

interface UseVoiceSessionHistoryOptions {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'ended' | 'error';
  enabled?: boolean;
}

/**
 * Hook to fetch paginated voice session history
 */
export function useVoiceSessionHistory(options: UseVoiceSessionHistoryOptions = {}) {
  const { page = 1, pageSize = 20, status, enabled = true } = options;

  const filters = { page, pageSize, status };

  return useQuery<VoiceSessionHistoryResponse>({
    queryKey: voiceKeys.sessionHistory(filters),
    queryFn: () => voiceService.getSessionHistory(page, pageSize, status),
    enabled,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a specific session with full transcript
 */
export function useVoiceSessionTranscript(sessionId: string | null) {
  return useQuery<VoiceSessionDetail>({
    queryKey: voiceKeys.sessionTranscript(sessionId ?? ''),
    queryFn: () => {
      // sessionId is guaranteed to be non-null when enabled is true
      if (!sessionId) throw new Error('Session ID is required');
      return voiceService.getSessionTranscript(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes (transcripts don't change)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to delete a voice session
 */
export function useDeleteVoiceSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => voiceService.deleteSessionHistory(sessionId),
    onSuccess: (_, sessionId) => {
      // Invalidate the session list
      void queryClient.invalidateQueries({ queryKey: voiceKeys.all });

      // Remove the specific session from cache
      queryClient.removeQueries({ queryKey: voiceKeys.sessionTranscript(sessionId) });
    },
  });
}

/**
 * Combined hook for voice session history management
 * Provides data, loading states, and mutation handlers
 */
export function useVoiceHistory(options: UseVoiceSessionHistoryOptions = {}) {
  const historyQuery = useVoiceSessionHistory(options);
  const deleteMutation = useDeleteVoiceSession();
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: voiceKeys.all });
  };

  return {
    // Data
    sessions: historyQuery.data?.sessions ?? [],
    totalCount: historyQuery.data?.totalCount ?? 0,
    page: historyQuery.data?.page ?? 1,
    pageSize: historyQuery.data?.pageSize ?? 20,
    totalPages: historyQuery.data?.totalPages ?? 0,
    hasNextPage: historyQuery.data?.hasNextPage ?? false,
    hasPreviousPage: historyQuery.data?.hasPreviousPage ?? false,

    // Loading states
    isLoading: historyQuery.isLoading,
    isFetching: historyQuery.isFetching,
    isError: historyQuery.isError,
    error: historyQuery.error,

    // Actions
    refresh,
    deleteSession: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
