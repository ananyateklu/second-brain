/**
 * Voice Session Selection Hook
 *
 * Manages selection mode state for bulk operations on voice sessions.
 */

import { useState, useCallback } from 'react';

interface VoiceSession {
  id: string;
}

interface UseVoiceSessionSelectionOptions {
  /** List of sessions for select all functionality */
  sessions: VoiceSession[];
  /** Callback to delete a session */
  deleteSession: (id: string) => Promise<void>;
  /** Currently viewing historical session ID */
  selectedHistoricalSessionId: string | null;
  /** Callback to clear historical session view */
  setSelectedHistoricalSessionId: (id: string | null) => void;
}

interface UseVoiceSessionSelectionReturn {
  isSelectionMode: boolean;
  selectedSessionIds: Set<string>;
  handleToggleSelectionMode: () => void;
  handleToggleSessionSelection: (sessionId: string) => void;
  handleSelectAllSessions: () => void;
  handleBulkDeleteSessions: () => Promise<void>;
  handleExitSelectionMode: () => void;
}

export function useVoiceSessionSelection({
  sessions,
  deleteSession,
  selectedHistoricalSessionId,
  setSelectedHistoricalSessionId,
}: UseVoiceSessionSelectionOptions): UseVoiceSessionSelectionReturn {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectedSessionIds(new Set());
    }
  }, [isSelectionMode]);

  const handleToggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const handleSelectAllSessions = useCallback(() => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  }, [selectedSessionIds.size, sessions]);

  const handleBulkDeleteSessions = useCallback(async () => {
    const idsToDelete = Array.from(selectedSessionIds);
    for (const id of idsToDelete) {
      await deleteSession(id);
    }
    setSelectedSessionIds(new Set());
    setIsSelectionMode(false);
    if (selectedHistoricalSessionId && selectedSessionIds.has(selectedHistoricalSessionId)) {
      setSelectedHistoricalSessionId(null);
    }
  }, [selectedSessionIds, deleteSession, selectedHistoricalSessionId, setSelectedHistoricalSessionId]);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedSessionIds(new Set());
  }, []);

  return {
    isSelectionMode,
    selectedSessionIds,
    handleToggleSelectionMode,
    handleToggleSessionSelection,
    handleSelectAllSessions,
    handleBulkDeleteSessions,
    handleExitSelectionMode,
  };
}

export type { UseVoiceSessionSelectionOptions, UseVoiceSessionSelectionReturn };
