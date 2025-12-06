/**
 * Chat Session Tracking Hooks
 * React Query hooks for PostgreSQL 18 temporal table features
 */

import { useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services';
import type {
  ChatSession,
  SessionStats,
  SessionHistory,
  EndSessionRequest,
} from '../../../types/chat';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { chatSessionKeys, type ChatSessionFilters } from '../../../lib/query-keys';

// Re-export query keys for convenience
export { chatSessionKeys };

/**
 * Hook to fetch session statistics for the authenticated user
 */
export function useSessionStats() {
  return useApiQuery<SessionStats>(
    chatSessionKeys.stats(),
    () => chatService.getSessionStats()
  );
}

/**
 * Hook to fetch active sessions for the authenticated user
 */
export function useActiveSessions() {
  return useApiQuery<ChatSession[]>(
    chatSessionKeys.active(),
    () => chatService.getActiveSessions()
  );
}

/**
 * Hook to fetch session history with optional date filters
 * @param filters - Optional date range filters (since, until)
 * @param enabled - Whether to enable the query
 */
export function useSessionHistory(filters?: ChatSessionFilters, enabled = true) {
  return useConditionalQuery<SessionHistory>(
    enabled,
    chatSessionKeys.history(filters),
    () => chatService.getSessionHistory(filters?.since, filters?.until)
  );
}

/**
 * Hook to fetch sessions for a specific conversation
 * @param conversationId - The conversation ID to get sessions for
 * @param skip - Number of sessions to skip (pagination)
 * @param take - Number of sessions to return (pagination)
 * @param enabled - Whether to enable the query
 */
export function useConversationSessions(
  conversationId: string,
  skip?: number,
  take?: number,
  enabled = true
) {
  return useConditionalQuery<SessionHistory>(
    !!conversationId && enabled,
    chatSessionKeys.byConversation(conversationId, skip, take),
    () => chatService.getConversationSessions(conversationId, skip, take)
  );
}

/**
 * Hook to start a new chat session
 */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useApiMutation<
    ChatSession,
    { conversationId: string; deviceInfo?: string; userAgent?: string }
  >(
    ({ conversationId, deviceInfo, userAgent }) =>
      chatService.startSession(conversationId, deviceInfo, userAgent),
    {
      errorMessage: 'Failed to start session',
      onSuccess: () => {
        // Invalidate active sessions and stats
        void queryClient.invalidateQueries({ queryKey: chatSessionKeys.active() });
        void queryClient.invalidateQueries({ queryKey: chatSessionKeys.stats() });
      },
    }
  );
}

/**
 * Context type for end session mutation
 */
interface EndSessionContext {
  previousActiveSessions?: ChatSession[];
}

/**
 * Hook to end an active chat session
 */
export function useEndSession() {
  const queryClient = useQueryClient();

  return useApiMutation<
    void,
    { sessionId: string; data?: EndSessionRequest },
    EndSessionContext
  >(
    ({ sessionId, data }) => chatService.endSession(sessionId, data),
    {
      errorMessage: 'Failed to end session',
      onMutate: async ({ sessionId }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: chatSessionKeys.active() });

        // Snapshot previous values
        const previousActiveSessions = queryClient.getQueryData<ChatSession[]>(
          chatSessionKeys.active()
        );

        // Optimistically remove the session from active sessions
        if (previousActiveSessions) {
          queryClient.setQueryData<ChatSession[]>(
            chatSessionKeys.active(),
            previousActiveSessions.filter((session) => session.id !== sessionId)
          );
        }

        return { previousActiveSessions };
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousActiveSessions) {
          queryClient.setQueryData(
            chatSessionKeys.active(),
            context.previousActiveSessions
          );
        }
      },
      onSettled: () => {
        // Invalidate related queries
        void queryClient.invalidateQueries({ queryKey: chatSessionKeys.active() });
        void queryClient.invalidateQueries({ queryKey: chatSessionKeys.stats() });
        void queryClient.invalidateQueries({ queryKey: chatSessionKeys.history() });
      },
    }
  );
}

/**
 * Hook to prefetch session statistics (useful for dashboard loading)
 * @returns Function to prefetch session stats
 */
export function usePrefetchSessionStats() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.prefetchQuery({
      queryKey: chatSessionKeys.stats(),
      queryFn: () => chatService.getSessionStats(),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

/**
 * Hook to invalidate all session-related queries
 * @returns Function to invalidate session queries
 */
export function useInvalidateSessionQueries() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: chatSessionKeys.all });
  };
}

/**
 * Helper to collect device information for session tracking
 * @returns Device info JSON string
 */
export function collectDeviceInfo(): string {
  const info: Record<string, unknown> = {};

  if (typeof navigator !== 'undefined') {
    info.userAgent = navigator.userAgent;
    // Use userAgent to infer platform instead of deprecated navigator.platform
    info.platform = navigator.userAgent.includes('Mac') ? 'MacIntel' : navigator.userAgent.includes('Win') ? 'Win32' : navigator.userAgent.includes('Linux') ? 'Linux x86_64' : 'Unknown';
    info.language = navigator.language;
    info.cookiesEnabled = navigator.cookieEnabled;
    info.onLine = navigator.onLine;

    // Detect device type
    const ua = navigator.userAgent.toLowerCase();
    info.isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    info.isTablet = /tablet|ipad/i.test(ua);
    info.isDesktop = !info.isMobile && !info.isTablet;

    // Check for Tauri
    info.isTauriApp = '__TAURI__' in window;
  }

  if (typeof screen !== 'undefined') {
    info.screenWidth = screen.width;
    info.screenHeight = screen.height;
    info.colorDepth = screen.colorDepth;
  }

  return JSON.stringify(info);
}
