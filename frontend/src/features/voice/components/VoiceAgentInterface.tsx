/**
 * VoiceAgentInterface Component
 * Main conversation interface container that composes all voice components
 *
 * Layout modes:
 * - Pre-session: Centered layout with settings panel
 * - Active session: Split layout (orb left, transcript/activity right)
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoundStore } from '../../../store/bound-store';
import { useVoiceSession } from '../hooks/use-voice-session';
import { VoiceOrb } from './VoiceOrb';
import { VoiceControls } from './VoiceControls';
import { VoiceTranscript } from './VoiceTranscript';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceSettings } from './VoiceSettings';
import { VoiceToolIndicator } from './VoiceToolIndicator';
import { VoiceAgentActivityPanel } from './VoiceAgentActivityPanel';
import type { VoiceSessionOptions } from '../types/voice-types';

export function VoiceAgentInterface() {
  const {
    selectedProvider,
    selectedModel,
    selectedVoiceId,
    isTranscribing,
    // Agent state
    agentEnabled,
    capabilities,
    toolExecutions,
    thinkingSteps,
    retrievedNotes,
    groundingSources,
    isToolExecuting,
    currentToolName,
    // Grok Voice state
    voiceProviderType,
    selectedGrokVoice,
    enableGrokWebSearch,
    enableGrokXSearch,
  } = useBoundStore();

  const {
    isConnected,
    isConnecting,
    sessionState,
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
    clearError,
  } = useVoiceSession({
    // Grok Voice uses 24kHz audio, standard voice uses 16kHz
    sampleRate: voiceProviderType === 'GrokVoice' ? 24000 : 16000,
  });

  // Handle start session
  const handleStart = useCallback(async () => {
    // Check required options based on voice provider type
    if (voiceProviderType === 'GrokVoice') {
      if (!selectedGrokVoice) {
        return;
      }
    } else {
      if (!selectedProvider || !selectedModel || !selectedVoiceId) {
        return;
      }
    }

    const options: VoiceSessionOptions = voiceProviderType === 'GrokVoice'
      ? {
        // Grok Voice options
        provider: 'GrokVoice',
        model: 'grok-voice',
        voiceId: selectedGrokVoice,
        voiceProviderType: 'GrokVoice',
        grokVoice: selectedGrokVoice,
        enableGrokWebSearch,
        enableGrokXSearch,
        // Custom app functions (notes CRUD, search)
        agentEnabled,
        capabilities: agentEnabled ? capabilities : [],
        enableRag: false,
        enableAgentRag: false,
      }
      : {
        // Standard voice options
        provider: selectedProvider ?? '',
        model: selectedModel ?? '',
        voiceId: selectedVoiceId ?? '',
        voiceProviderType: 'Standard',
        enableRag: false, // Don't auto-inject RAG context
        temperature: 0.7,
        // Agent mode options
        agentEnabled,
        capabilities: agentEnabled ? capabilities : [],
        // Disable automatic RAG context fetching - agent will use SemanticSearch/SearchNotes tools when needed
        enableAgentRag: false,
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
    startSession,
  ]);

  // Handle orb click - start or interrupt
  const handleOrbClick = useCallback(() => {
    if (!isConnected) {
      void handleStart();
    } else if (isAudioPlaying) {
      interrupt();
    }
  }, [isConnected, isAudioPlaying, handleStart, interrupt]);

  // Wrapped handlers for components that don't expect promises
  const handleStartSync = useCallback(() => {
    void handleStart();
  }, [handleStart]);

  const handleStopSync = useCallback(() => {
    void endSession();
  }, [endSession]);

  // Check if ready to start based on voice provider type
  const canStart = voiceProviderType === 'GrokVoice'
    ? Boolean(selectedGrokVoice)
    : Boolean(selectedProvider && selectedModel && selectedVoiceId);

  // Check if there's any agent activity to show
  const hasAgentActivity = agentEnabled && (
    toolExecutions.length > 0 ||
    thinkingSteps.length > 0 ||
    retrievedNotes.length > 0 ||
    groundingSources.length > 0
  );

  // Check if there's any transcript content
  const hasTranscriptContent = transcriptHistory.length > 0 || currentTranscript || currentAssistantTranscript;

  return (
    <div className="h-full flex flex-col">
      {!isConnected ? (
        // Pre-session: Split layout (orb left, settings right)
        <div className="flex-1 flex min-h-0">
          {/* Left: Orb Section (40%) - glassmorphism background */}
          <div
            className="w-2/5 flex flex-col items-center justify-center px-6"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              borderRight: '1px solid var(--border)',
            }}
          >
            {/* Status indicator */}
            <VoiceStatusIndicator
              state={sessionState}
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={error}
            />

            {/* Clear error button */}
            {error && (
              <button
                onClick={clearError}
                className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Dismiss error
              </button>
            )}

            {/* Main orb */}
            <div className="my-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <VoiceOrb
                  state={sessionState}
                  audioLevel={audioLevel}
                  size="lg"
                  onClick={handleOrbClick}
                  disabled={!canStart || isConnecting}
                />
              </motion.div>
            </div>

            {/* Controls */}
            <VoiceControls
              state={sessionState}
              isConnected={isConnected}
              isConnecting={isConnecting}
              isMicrophoneEnabled={isMicrophoneEnabled}
              isAudioPlaying={isAudioPlaying}
              onStart={handleStartSync}
              onStop={handleStopSync}
              onToggleMicrophone={toggleMicrophone}
              onInterrupt={interrupt}
            />
          </div>

          {/* Right: Settings Section (60%) */}
          <div
            className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-lg"
            >
              <VoiceSettings disabled={isConnecting} />
            </motion.div>

            {/* Help text */}
            {!isConnecting && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-[var(--text-tertiary)] text-center max-w-md mt-6"
              >
                {!canStart
                  ? voiceProviderType === 'GrokVoice'
                    ? 'Select a Grok voice to start a conversation.'
                    : 'Select a provider, model, and voice to start a conversation.'
                  : 'Click the orb or press Start Session to begin a voice conversation with the AI.'}
              </motion.p>
            )}
          </div>
        </div>
      ) : (
        // Active session: Split layout (orb left, content right)
        <div className="flex-1 flex min-h-0">
          {/* Left: Orb Section (40%) - glassmorphism background */}
          <div
            className="w-2/5 flex flex-col items-center justify-center px-6"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              borderRight: '1px solid var(--border)',
            }}
          >
            {/* Status indicator */}
            <VoiceStatusIndicator
              state={sessionState}
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={error}
            />

            {/* Clear error button */}
            {error && (
              <button
                onClick={clearError}
                className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Dismiss error
              </button>
            )}

            {/* Main orb with tool indicator */}
            <div className="relative my-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <VoiceOrb
                  state={sessionState}
                  audioLevel={audioLevel}
                  size="lg"
                  onClick={handleOrbClick}
                  disabled={isConnecting}
                />
              </motion.div>

              {/* Tool indicator - centered in the middle of the orb */}
              <AnimatePresence>
                {isToolExecuting && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <VoiceToolIndicator
                      isExecuting={isToolExecuting}
                      toolName={currentToolName}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="mt-4">
              <VoiceControls
                state={sessionState}
                isConnected={isConnected}
                isConnecting={isConnecting}
                isMicrophoneEnabled={isMicrophoneEnabled}
                isAudioPlaying={isAudioPlaying}
                onStart={handleStartSync}
                onStop={handleStopSync}
                onToggleMicrophone={toggleMicrophone}
                onInterrupt={interrupt}
              />
            </div>
          </div>

          {/* Right: Content Section (60%) */}
          <div
            className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
            }}
          >
            {/* Transcript - takes available space */}
            <VoiceTranscript
              className="flex-1 min-h-0"
              transcriptHistory={transcriptHistory}
              currentTranscript={currentTranscript}
              currentAssistantTranscript={currentAssistantTranscript}
              isTranscribing={isTranscribing}
              sessionState={sessionState}
            />

            {/* Agent Activity Panel - fixed max height */}
            <AnimatePresence>
              {hasAgentActivity && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex-shrink-0 max-h-[40%] overflow-hidden"
                >
                  <VoiceAgentActivityPanel
                    className="h-full"
                    toolExecutions={toolExecutions}
                    thinkingSteps={thinkingSteps}
                    retrievedNotes={retrievedNotes}
                    groundingSources={groundingSources}
                    isToolExecuting={isToolExecuting}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state when no content yet */}
            {!hasTranscriptContent && !hasAgentActivity && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-[var(--text-tertiary)] text-center">
                  Start speaking to begin the conversation...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
