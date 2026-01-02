/**
 * Claude Code Session Hook
 * Fetches and manages Claude Code session.md data for display in Focus UI
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { isTauri } from '@/lib/native-notifications';
import { readClaudeSession } from '@/lib/tauri-bridge';
import { parseClaudeSession, isValidSessionContent } from '../utils/parse-claude-session';
import type {
  ClaudeSessionData,
  UseClaudeSessionOptions,
  UseClaudeSessionReturn,
} from '../types/claude-session';

/** Query key for Claude session data */
const CLAUDE_SESSION_KEY = ['claude-session'] as const;

/** Default refresh interval (30 seconds) */
const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

/** Default project path */
const DEFAULT_PROJECT_PATH = '/Users/ananyateklu/Dev/second-brain';

/**
 * Hook to fetch and manage Claude Code session data
 *
 * In Tauri mode: Reads .claude/session.md from the project directory
 * In web mode: Allows manual paste of session content
 *
 * @param options - Configuration options
 * @returns Session data and control functions
 *
 * @example
 * ```tsx
 * const {
 *   session,
 *   isLoading,
 *   isTauriMode,
 *   refresh,
 *   setFromPaste,
 * } = useClaudeSession();
 *
 * if (session) {
 *   console.log('Current focus:', session.focus);
 * }
 * ```
 */
export function useClaudeSession(
  options: UseClaudeSessionOptions = {}
): UseClaudeSessionReturn {
  const {
    projectPath = DEFAULT_PROJECT_PATH,
    autoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL_MS,
  } = options;

  const queryClient = useQueryClient();
  const [pastedSession, setPastedSession] = useState<ClaudeSessionData | null>(null);
  const isTauriMode = isTauri();

  // Query for Tauri file-based session
  const query = useQuery({
    queryKey: [...CLAUDE_SESSION_KEY, projectPath],
    queryFn: async (): Promise<ClaudeSessionData | null> => {
      if (!isTauriMode) return null;

      const content = await readClaudeSession(projectPath);
      if (!content) return null;

      return parseClaudeSession(content, 'file');
    },
    enabled: isTauriMode,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: true,
    staleTime: refreshInterval / 2,
    retry: 1,
    // Don't show loading state during background refetches
    refetchIntervalInBackground: false,
  });

  /**
   * Manually refresh the session data
   */
  const refresh = useCallback(() => {
    if (isTauriMode) {
      void queryClient.invalidateQueries({ queryKey: CLAUDE_SESSION_KEY });
    }
  }, [queryClient, isTauriMode]);

  /**
   * Set session from pasted content (web fallback)
   */
  const setFromPaste = useCallback((content: string) => {
    if (!isValidSessionContent(content)) {
      console.warn('Invalid session content pasted');
      return;
    }

    try {
      const parsed = parseClaudeSession(content, 'paste');
      setPastedSession(parsed);
    } catch (e) {
      console.error('Failed to parse pasted session:', e);
    }
  }, []);

  /**
   * Clear the current session
   */
  const clearSession = useCallback(() => {
    setPastedSession(null);
    if (isTauriMode) {
      void queryClient.invalidateQueries({ queryKey: CLAUDE_SESSION_KEY });
    }
  }, [queryClient, isTauriMode]);

  // In Tauri mode, use query data; in web mode, use pasted data
  const session = isTauriMode ? query.data ?? null : pastedSession;

  return {
    session,
    isLoading: isTauriMode && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isTauriMode,
    refresh,
    setFromPaste,
    clearSession,
  };
}
