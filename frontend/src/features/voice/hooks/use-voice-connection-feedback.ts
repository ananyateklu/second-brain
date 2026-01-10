/**
 * Voice Connection Feedback Hook
 *
 * Manages disconnect feedback state and tool chip visibility.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { VoiceToolExecution } from '../types/voice-types';

interface UseVoiceConnectionFeedbackOptions {
  /** Current error message from voice session */
  error: string | null | undefined;
  /** Function to clear the error */
  clearError: () => void;
  /** Current tool executions from store */
  toolExecutions: VoiceToolExecution[];
}

interface UseVoiceConnectionFeedbackReturn {
  /** Whether to show "disconnected" feedback */
  showDisconnected: boolean;
  /** Tool chips filtered by dismissed state */
  activeToolChips: VoiceToolExecution[];
  /** Callback when a tool chip animation completes */
  handleToolChipComplete: (toolId: string) => void;
}

export function useVoiceConnectionFeedback({
  error,
  clearError,
  toolExecutions,
}: UseVoiceConnectionFeedbackOptions): UseVoiceConnectionFeedbackReturn {
  // Disconnect feedback state - shows "Connection closed" briefly after disconnect
  const [showDisconnected, setShowDisconnected] = useState(false);

  // Watch for disconnect errors and show feedback briefly
  useEffect(() => {
    if (!error?.toLowerCase().includes('disconnected')) {
      return;
    }
    // Schedule state update asynchronously to avoid cascading renders
    const showTimer = setTimeout(() => setShowDisconnected(true), 0);
    // Auto-reset after 3 seconds
    const hideTimer = setTimeout(() => {
      setShowDisconnected(false);
      clearError();
    }, 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [error, clearError]);

  // Tool chips for floating bar - track dismissed tool IDs
  const [dismissedToolIds, setDismissedToolIds] = useState<Set<string>>(new Set());

  // Derive active tool chips from toolExecutions
  // Show all executing tools and recently updated completed tools
  // The VoiceToolChip handles its own animation timing and calls onComplete when done
  const activeToolChips = useMemo(() => {
    return toolExecutions.filter(tool => {
      // Don't show dismissed tools
      if (dismissedToolIds.has(tool.toolId)) return false;
      // Show executing or completed/failed tools (chip handles exit animation)
      return true;
    });
  }, [toolExecutions, dismissedToolIds]);

  // Remove completed tool chip (called when chip exit animation finishes)
  const handleToolChipComplete = useCallback((toolId: string) => {
    setDismissedToolIds(prev => new Set([...prev, toolId]));
  }, []);

  return {
    showDisconnected,
    activeToolChips,
    handleToolChipComplete,
  };
}

export type { UseVoiceConnectionFeedbackOptions, UseVoiceConnectionFeedbackReturn };
