/**
 * VoiceAgentInterface Component
 * Main voice conversation interface with floating waveform input bar.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │ (Header controls via VoicePageContext)              │
 * ├──────────────┬──────────────────────────────────────┤
 * │              │                                       │
 * │   Sidebar    │     Transcript Area (flex-1)         │
 * │   (history)  │     ├── VoiceTranscript              │
 * │              │     │   ├── Message bubbles          │
 * │              │     │   ├── Process timelines        │
 * │              │     │   └── Streaming indicators     │
 * │              │     │                                 │
 * │              │     │  (padding-bottom for bar)      │
 * │              ├─────┴────────────────────────────────┤
 * │              │  VoiceInputBar (floating, absolute)  │
 * │              │  └── Tool chips + Waveform + Controls│
 * └──────────────┴──────────────────────────────────────┘
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoundStore } from '../../../store/bound-store';
import { useVoiceSession } from '../hooks/use-voice-session';
import { useVoiceHistory, useVoiceSessionTranscript } from '../hooks/use-voice-session-history';
import { useVoicePageContext } from '../context/VoicePageContext';
import { useAIHealth } from '../../ai/hooks/use-ai-health';
import { VoiceTranscript } from './VoiceTranscript';
import { VoiceInputBar } from './VoiceInputBar';
import { VoiceSidebar } from './VoiceSidebar';
import { VoiceConfigurationBanner } from './VoiceConfigurationBanner';
import { voiceService } from '../../../services/voice.service';
import type { VoiceSessionOptions } from '../types/voice-types';
import type { VoiceHeaderState, VoiceAgentCapability } from '../context/VoicePageContext';

export function VoiceAgentInterface() {
  const { setHeaderState } = useVoicePageContext();

  // Store state
  const {
    selectedProvider,
    selectedModel,
    selectedVoiceId,
    availableVoices,
    isTranscribing,
    // Agent state
    agentEnabled,
    capabilities,
    voiceRagEnabled,
    toolExecutions,
    thinkingSteps,
    retrievedNotes,
    groundingSources: _groundingSources,
    isToolExecuting: _isToolExecuting,
    currentToolName: _currentToolName,
    // Grok Voice state
    voiceProviderType,
    grokVoiceAvailable,
    deepgramAvailable,
    elevenLabsAvailable,
    selectedGrokVoice,
    availableGrokVoices,
    enableGrokWebSearch,
    enableGrokXSearch,
    // Sidebar state
    voiceSidebarVisible,
    selectedHistoricalSessionId,
    // Store actions
    setSelectedProvider,
    setSelectedModel,
    setSelectedVoiceId,
    setAgentEnabled,
    setCapabilities,
    setVoiceRagEnabled,
    setVoiceProviderType,
    setSelectedGrokVoice,
    setEnableGrokWebSearch,
    setEnableGrokXSearch,
    toggleVoiceSidebar,
    setSelectedHistoricalSessionId,
    setAvailableVoices,
    setAvailableGrokVoices,
    clearTranscriptHistory,
  } = useBoundStore();

  // AI health for provider/model selection
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth, isRefetching } = useAIHealth();

  // Load available voices on mount (only once)
  useEffect(() => {
    let mounted = true;

    const loadVoices = async () => {
      try {
        // Load ElevenLabs/OpenAI TTS voices
        const voices = await voiceService.getVoices();
        if (mounted && voices.length > 0) {
          setAvailableVoices(voices);
        }
      } catch (err) {
        console.error('Failed to load TTS voices:', err);
      }

      try {
        // Load Grok voices
        const grokVoices = await voiceService.getGrokVoices();
        if (mounted && grokVoices.length > 0) {
          setAvailableGrokVoices(grokVoices);
        }
      } catch (err) {
        console.error('Failed to load Grok voices:', err);
      }
    };

    void loadVoices();

    return () => {
      mounted = false;
    };
  }, [setAvailableVoices, setAvailableGrokVoices]);

  // Voice session hook
  const {
    isConnected,
    isConnecting,
    sessionState,
    sessionId,
    isMicrophoneEnabled,
    isAudioPlaying,
    audioLevel,
    currentTranscript,
    currentAssistantTranscript,
    transcriptHistory,
    error,
    startSession,
    endSession,
    interrupt,
    toggleMicrophone,
    clearError: _clearError,
  } = useVoiceSession({
    sampleRate: voiceProviderType === 'GrokVoice' ? 24000 : 16000,
  });

  // Session history
  const {
    sessions,
    isLoading: isLoadingHistory,
    refresh: refreshHistory,
    deleteSession,
  } = useVoiceHistory();

  // Get historical transcript when viewing past session
  const { data: historicalTranscript } = useVoiceSessionTranscript(selectedHistoricalSessionId);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

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
      _clearError();
    }, 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [error, _clearError]);

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

  // Get available providers
  const providers = healthData?.providers;
  const availableProviders = useMemo(() => {
    if (!providers) return [];
    return providers
      .filter((p) => p.isHealthy)
      .map((p) => ({
        provider: p.provider,
        isHealthy: p.isHealthy,
        availableModels: p.availableModels || [],
      }));
  }, [providers]);

  // Build agent capabilities for header
  const agentCapabilities: VoiceAgentCapability[] = useMemo(() => [
    {
      id: 'notes-crud',
      displayName: 'Notes CRUD',
      enabled: capabilities.includes('notes-crud'),
      onChange: (enabled: boolean) => {
        if (enabled) {
          setCapabilities([...capabilities, 'notes-crud']);
        } else {
          setCapabilities(capabilities.filter((c) => c !== 'notes-crud'));
        }
      },
    },
    {
      id: 'notes-search',
      displayName: 'Notes Search',
      enabled: capabilities.includes('notes-search'),
      onChange: (enabled: boolean) => {
        if (enabled) {
          setCapabilities([...capabilities, 'notes-search']);
        } else {
          setCapabilities(capabilities.filter((c) => c !== 'notes-search'));
        }
      },
    },
    ...(voiceProviderType === 'Standard' ? [{
      id: 'web',
      displayName: 'Web Search',
      enabled: capabilities.includes('web'),
      onChange: (enabled: boolean) => {
        if (enabled) {
          setCapabilities([...capabilities, 'web']);
        } else {
          setCapabilities(capabilities.filter((c) => c !== 'web'));
        }
      },
    }] : []),
  ], [capabilities, setCapabilities, voiceProviderType]);

  // Handle start session
  const handleStart = useCallback(async () => {
    // Clear historical session view when starting new session
    setSelectedHistoricalSessionId(null);

    if (voiceProviderType === 'GrokVoice') {
      if (!selectedGrokVoice) return;
    } else {
      if (!selectedProvider || !selectedModel || !selectedVoiceId) return;
    }

    const options: VoiceSessionOptions = voiceProviderType === 'GrokVoice'
      ? {
        provider: 'GrokVoice',
        model: 'grok-voice',
        voiceId: selectedGrokVoice,
        voiceProviderType: 'GrokVoice',
        grokVoice: selectedGrokVoice,
        enableGrokWebSearch,
        enableGrokXSearch,
        agentEnabled,
        capabilities: agentEnabled ? capabilities : [],
        enableRag: agentEnabled && voiceRagEnabled,
        enableAgentRag: agentEnabled && voiceRagEnabled,
      }
      : {
        provider: selectedProvider ?? '',
        model: selectedModel ?? '',
        voiceId: selectedVoiceId ?? '',
        voiceProviderType: 'Standard',
        enableRag: agentEnabled && voiceRagEnabled,
        temperature: 0.7,
        agentEnabled,
        capabilities: agentEnabled ? capabilities : [],
        enableAgentRag: agentEnabled && voiceRagEnabled,
      };

    try {
      await startSession(options);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }, [
    voiceProviderType,
    selectedProvider,
    selectedModel,
    selectedVoiceId,
    selectedGrokVoice,
    enableGrokWebSearch,
    enableGrokXSearch,
    agentEnabled,
    capabilities,
    voiceRagEnabled,
    startSession,
    setSelectedHistoricalSessionId,
  ]);

  // Wrapped handlers
  const handleStartSync = useCallback(() => void handleStart(), [handleStart]);
  const handleStopSync = useCallback(() => void endSession(), [endSession]);

  // Handle new session (clear history view and transcript for fresh start)
  const handleNewSession = useCallback(() => {
    setSelectedHistoricalSessionId(null);
    clearTranscriptHistory();
  }, [setSelectedHistoricalSessionId, clearTranscriptHistory]);

  // Handle delete session
  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    if (selectedHistoricalSessionId === id) {
      setSelectedHistoricalSessionId(null);
    }
  }, [deleteSession, selectedHistoricalSessionId, setSelectedHistoricalSessionId]);

  // Selection mode handlers
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

  // Populate header state
  useEffect(() => {
    const headerState: VoiceHeaderState = {
      showSidebar: voiceSidebarVisible,
      onToggleSidebar: toggleVoiceSidebar,
      isHealthLoading,
      availableProviders,
      selectedProvider,
      selectedModel,
      onProviderChange: setSelectedProvider,
      onModelChange: setSelectedModel,
      onRefreshProviders: async () => { await refetchHealth(); },
      isRefreshing: isRefetching,
      voiceProviderType,
      onVoiceProviderTypeChange: setVoiceProviderType,
      selectedVoiceId,
      availableVoices,
      onVoiceChange: setSelectedVoiceId,
      selectedGrokVoice,
      availableGrokVoices,
      onGrokVoiceChange: setSelectedGrokVoice,
      enableGrokWebSearch,
      enableGrokXSearch,
      onGrokWebSearchChange: setEnableGrokWebSearch,
      onGrokXSearchChange: setEnableGrokXSearch,
      agentEnabled,
      onAgentModeChange: setAgentEnabled,
      agentCapabilities,
      voiceRagEnabled,
      onVoiceRagChange: setVoiceRagEnabled,
      isConnected,
      isConnecting,
      sessionState,
      sessionId,
      // Session stats
      transcriptCount: transcriptHistory.length,
      // History viewing
      isViewingHistory: !!selectedHistoricalSessionId && !isConnected,
      onBackToCurrent: () => setSelectedHistoricalSessionId(null),
      sessionHistory: sessions,
      sessionCount: sessions.length,
      isLoadingHistory,
      selectedHistoricalSessionId,
      onSelectHistoricalSession: setSelectedHistoricalSessionId,
      onDeleteSession: handleDeleteSession,
      onRefreshHistory: refreshHistory,
      onNewSession: handleNewSession,
      // Selection mode
      isSelectionMode,
      selectedSessionIds,
      onToggleSelectionMode: handleToggleSelectionMode,
      onToggleSessionSelection: handleToggleSessionSelection,
      onSelectAllSessions: handleSelectAllSessions,
      onBulkDeleteSessions: handleBulkDeleteSessions,
      onExitSelectionMode: handleExitSelectionMode,
      // Session actions
      onStartSession: handleStartSync,
      onEndSession: handleStopSync,
    };

    setHeaderState(headerState);

    // Clear header state on unmount
    return () => setHeaderState(null);
  }, [
    voiceSidebarVisible,
    toggleVoiceSidebar,
    isHealthLoading,
    availableProviders,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    refetchHealth,
    isRefetching,
    voiceProviderType,
    setVoiceProviderType,
    selectedVoiceId,
    availableVoices,
    setSelectedVoiceId,
    selectedGrokVoice,
    availableGrokVoices,
    setSelectedGrokVoice,
    enableGrokWebSearch,
    enableGrokXSearch,
    setEnableGrokWebSearch,
    setEnableGrokXSearch,
    agentEnabled,
    setAgentEnabled,
    agentCapabilities,
    voiceRagEnabled,
    setVoiceRagEnabled,
    isConnected,
    isConnecting,
    sessionState,
    sessionId,
    transcriptHistory.length,
    sessions,
    isLoadingHistory,
    selectedHistoricalSessionId,
    setSelectedHistoricalSessionId,
    handleDeleteSession,
    refreshHistory,
    handleNewSession,
    isSelectionMode,
    selectedSessionIds,
    handleToggleSelectionMode,
    handleToggleSessionSelection,
    handleSelectAllSessions,
    handleBulkDeleteSessions,
    handleExitSelectionMode,
    handleStartSync,
    handleStopSync,
    setHeaderState,
  ]);

  // Check if ready to start
  const canStart = voiceProviderType === 'GrokVoice'
    ? Boolean(selectedGrokVoice)
    : Boolean(selectedProvider && selectedModel && selectedVoiceId);

  // Disabled reason for tooltip
  const disabledReason = !canStart
    ? voiceProviderType === 'GrokVoice'
      ? 'Select a Grok voice to start'
      : 'Select provider, model, and voice to start'
    : undefined;

  // Check if viewing historical session
  const isViewingHistory = !!selectedHistoricalSessionId && !isConnected;

  // Check if current voice mode is configured
  const standardVoiceAvailable = deepgramAvailable && elevenLabsAvailable;
  const isCurrentModeConfigured = voiceProviderType === 'GrokVoice'
    ? grokVoiceAvailable
    : standardVoiceAvailable;

  // Get transcript to display (current or historical)
  const displayTranscriptHistory = isViewingHistory
    ? historicalTranscript?.turns.map((t) => {
        // Parse tool calls from JSON if present
        let toolExecutions: import('../types/voice-types').VoiceToolExecution[] | undefined;
        if (t.toolCallsJson) {
          try {
            const parsed = JSON.parse(t.toolCallsJson) as Array<{
              toolId: string;
              toolName: string;
              arguments?: string;
              result?: string;
              startedAt: string;
              completedAt?: string;
              status: string;
            }>;
            toolExecutions = parsed.map((tc) => ({
              toolId: tc.toolId,
              toolName: tc.toolName,
              arguments: tc.arguments,
              result: tc.result,
              status: tc.status as 'pending' | 'executing' | 'completed' | 'failed',
              timestamp: new Date(tc.startedAt).getTime(),
            }));
          } catch {
            // Ignore parse errors
          }
        }
        return {
          role: t.role,
          content: t.content || t.transcriptText || '',
          timestamp: new Date(t.timestamp).getTime(),
          toolExecutions,
        };
      }) ?? []
    : transcriptHistory;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {voiceSidebarVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <VoiceSidebar
              sessions={sessions}
              selectedSessionId={selectedHistoricalSessionId}
              currentSessionId={sessionId}
              isLoading={isLoadingHistory}
              isSelectionMode={isSelectionMode}
              selectedSessionIds={selectedSessionIds}
              onSelectSession={setSelectedHistoricalSessionId}
              onToggleSessionSelection={handleToggleSessionSelection}
              onDeleteSession={(id) => void handleDeleteSession(id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-0 min-w-0">
        {/* Configuration Banner - shown when current mode is not configured */}
        {!isCurrentModeConfigured && !isViewingHistory ? (
          <VoiceConfigurationBanner
            voiceProviderType={voiceProviderType}
            grokVoiceAvailable={grokVoiceAvailable}
            deepgramAvailable={deepgramAvailable}
            elevenLabsAvailable={elevenLabsAvailable}
            onSwitchMode={setVoiceProviderType}
          />
        ) : (
          /* Transcript - shown when mode is configured or viewing history */
          <VoiceTranscript
            transcriptHistory={displayTranscriptHistory}
            currentTranscript={isViewingHistory ? '' : currentTranscript}
            currentAssistantTranscript={isViewingHistory ? '' : currentAssistantTranscript}
            isTranscribing={isViewingHistory ? false : isTranscribing}
            sessionState={isViewingHistory ? 'Idle' : sessionState}
            activeToolExecutions={isViewingHistory ? [] : toolExecutions.filter(t => t.status === 'executing')}
            activeThinkingSteps={isViewingHistory ? [] : thinkingSteps}
            activeRetrievedNotes={isViewingHistory ? [] : retrievedNotes}
          />
        )}

        {/* Floating Voice Input Bar */}
        {!isViewingHistory && (
          <VoiceInputBar
            isConnected={isConnected}
            isConnecting={isConnecting}
            sessionState={sessionState}
            audioLevel={audioLevel}
            activeTools={activeToolChips}
            onToolComplete={handleToolChipComplete}
            isMicrophoneEnabled={isMicrophoneEnabled}
            isAudioPlaying={isAudioPlaying}
            onStart={handleStartSync}
            onStop={handleStopSync}
            onToggleMicrophone={toggleMicrophone}
            onInterrupt={interrupt}
            canStart={canStart}
            disabledReason={disabledReason}
            showDisconnected={showDisconnected}
          />
        )}

        {/* Error toast - hide disconnect errors since they're shown in the button */}
        <AnimatePresence>
          {error && !error.toLowerCase().includes('disconnected') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 max-w-md px-4 py-3 rounded-xl"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-red-500) 15%, var(--surface-card))',
                border: '1px solid var(--color-red-500)',
                color: 'var(--color-red-500)',
              }}
            >
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
