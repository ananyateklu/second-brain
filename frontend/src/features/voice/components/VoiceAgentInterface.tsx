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

import { useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoundStore } from '../../../store/bound-store';
import { useVoiceSession } from '../hooks/use-voice-session';
import { useVoiceHistory, useVoiceSessionTranscript } from '../hooks/use-voice-session-history';
import { useMobileDetection } from '../hooks/use-mobile-detection';
import { useVoiceSessionSelection } from '../hooks/use-voice-session-selection';
import { useVoiceConnectionFeedback } from '../hooks/use-voice-connection-feedback';
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

  // Mobile detection with sidebar handling
  const { isMobile } = useMobileDetection({
    sidebarVisible: voiceSidebarVisible,
    onCloseSidebar: toggleVoiceSidebar,
  });

  // Selection mode for bulk operations
  const {
    isSelectionMode,
    selectedSessionIds,
    handleToggleSelectionMode,
    handleToggleSessionSelection,
    handleSelectAllSessions,
    handleBulkDeleteSessions,
    handleExitSelectionMode,
  } = useVoiceSessionSelection({
    sessions,
    deleteSession,
    selectedHistoricalSessionId,
    setSelectedHistoricalSessionId,
  });

  // Connection feedback and tool chips
  const {
    showDisconnected,
    activeToolChips,
    handleToolChipComplete,
  } = useVoiceConnectionFeedback({
    error,
    clearError: _clearError,
    toolExecutions,
  });

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
      {/* Mobile Sidebar Overlay - Backdrop */}
      {isMobile && voiceSidebarVisible && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={toggleVoiceSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer - z-[60] to be above overlay */}
      {isMobile && (
        <aside
          className={`fixed top-0 left-0 bottom-0 z-[60] w-72 max-w-[80vw] transform transition-transform duration-300 ease-out flex flex-col backdrop-blur-xl ${
            voiceSidebarVisible ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
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
            onClose={toggleVoiceSidebar}
          />
        </aside>
      )}

      {/* Desktop Sidebar - Animated inline */}
      {!isMobile && (
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
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-h-0 min-w-0">
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
            // Mobile controls
            voiceProviderType={voiceProviderType}
            onVoiceProviderTypeChange={setVoiceProviderType}
            grokVoiceAvailable={grokVoiceAvailable}
            standardVoiceAvailable={standardVoiceAvailable}
            selectedVoiceId={selectedVoiceId}
            availableVoices={availableVoices}
            onVoiceChange={setSelectedVoiceId}
            selectedGrokVoice={selectedGrokVoice}
            availableGrokVoices={availableGrokVoices}
            onGrokVoiceChange={setSelectedGrokVoice}
            agentEnabled={agentEnabled}
            onAgentModeChange={setAgentEnabled}
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
