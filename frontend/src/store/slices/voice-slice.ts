/**
 * Voice Slice
 * Manages voice agent session state, audio controls, and transcript
 */

import type { SliceCreator, VoiceSlice } from '../types';
import type {
  VoiceSessionState,
  VoiceProviderType,
  VoiceInfo,
  GrokVoiceInfo,
  VoiceToolExecution,
  VoiceThinkingStep,
  VoiceRetrievedNote,
  VoiceGroundingSource,
} from '../../features/voice/types/voice-types';
import { normalizeState } from '../../features/voice/utils/voice-utils';

// ============================================
// Constants
// ============================================

// Maximum number of transcript entries to keep in history
// Prevents unbounded memory growth during long voice sessions
const MAX_TRANSCRIPT_ENTRIES = 100;

// ============================================
// Default State
// ============================================

const defaultVoiceState = {
  // Session state
  sessionId: null as string | null,
  sessionState: 'Idle' as VoiceSessionState,
  isConnecting: false,
  isConnected: false,

  // Audio controls
  isMicrophoneEnabled: true,
  isMuted: false,
  isAudioPlaying: false,
  audioLevel: 0,

  // Transcript
  currentTranscript: '',
  currentAssistantTranscript: '',
  isTranscribing: false,
  transcriptHistory: [] as Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>,

  // Settings
  selectedProvider: null as string | null,
  selectedModel: null as string | null,
  selectedVoiceId: null as string | null,
  availableVoices: [] as VoiceInfo[],

  // Service status
  isServiceAvailable: false,
  deepgramAvailable: false,
  elevenLabsAvailable: false,
  grokVoiceAvailable: false,

  // Voice provider type (Standard vs GrokVoice - must match backend enum)
  voiceProviderType: 'GrokVoice' as VoiceProviderType,

  // Grok Voice settings
  selectedGrokVoice: 'ara' as string,
  availableGrokVoices: [] as GrokVoiceInfo[],
  enableGrokWebSearch: true,
  enableGrokXSearch: true,

  // Errors
  error: null as string | null,

  // Agent mode state
  agentEnabled: true,
  capabilities: ['notes-crud', 'notes-search'] as string[],
  toolExecutions: [] as VoiceToolExecution[],
  thinkingSteps: [] as VoiceThinkingStep[],
  retrievedNotes: [] as VoiceRetrievedNote[],
  ragLogId: null as string | null,
  groundingSources: [] as VoiceGroundingSource[],
  isToolExecuting: false,
  currentToolName: null as string | null,
};

// ============================================
// Slice Creator
// ============================================

export const createVoiceSlice: SliceCreator<VoiceSlice> = (set) => ({
  ...defaultVoiceState,

  // Session actions
  setSessionId: (sessionId: string | null) => {
    set({ sessionId });
  },

  setSessionState: (sessionState: VoiceSessionState | number) => {
    set({ sessionState: normalizeState(sessionState) });
  },

  setIsConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  setIsConnected: (isConnected: boolean) => {
    set({ isConnected });
  },

  // Audio control actions
  setMicrophoneEnabled: (enabled: boolean) => {
    set({ isMicrophoneEnabled: enabled });
  },

  toggleMicrophone: () => {
    set((state) => ({ isMicrophoneEnabled: !state.isMicrophoneEnabled }));
  },

  setMuted: (muted: boolean) => {
    set({ isMuted: muted });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  setAudioPlaying: (playing: boolean) => {
    set({ isAudioPlaying: playing });
  },

  setAudioLevel: (level: number) => {
    set({ audioLevel: level });
  },

  // Transcript actions
  setCurrentTranscript: (transcript: string) => {
    set({ currentTranscript: transcript });
  },

  setCurrentAssistantTranscript: (transcript: string) => {
    set({ currentAssistantTranscript: transcript });
  },

  setIsTranscribing: (isTranscribing: boolean) => {
    set({ isTranscribing: isTranscribing });
  },

  addTranscriptEntry: (role: 'user' | 'assistant', content: string) => {
    set((state) => {
      const newTranscripts = [
        ...state.transcriptHistory,
        { role, content, timestamp: Date.now() },
      ];
      // Keep only the last MAX_TRANSCRIPT_ENTRIES to prevent unbounded memory growth
      if (newTranscripts.length > MAX_TRANSCRIPT_ENTRIES) {
        newTranscripts.splice(0, newTranscripts.length - MAX_TRANSCRIPT_ENTRIES);
      }
      return { transcriptHistory: newTranscripts };
    });
  },

  clearTranscriptHistory: () => {
    set({ transcriptHistory: [], currentTranscript: '', currentAssistantTranscript: '' });
  },

  // Settings actions
  setSelectedProvider: (provider: string | null) => {
    set({ selectedProvider: provider });
  },

  setSelectedModel: (model: string | null) => {
    set({ selectedModel: model });
  },

  setSelectedVoiceId: (voiceId: string | null) => {
    set({ selectedVoiceId: voiceId });
  },

  setAvailableVoices: (voices: VoiceInfo[]) => {
    set({ availableVoices: voices });
  },

  // Service status actions
  setServiceStatus: (status: { deepgramAvailable: boolean; elevenLabsAvailable: boolean; voiceAgentEnabled: boolean; grokVoiceAvailable?: boolean }) => {
    set({
      isServiceAvailable: status.voiceAgentEnabled && (status.deepgramAvailable && status.elevenLabsAvailable || status.grokVoiceAvailable === true),
      deepgramAvailable: status.deepgramAvailable,
      elevenLabsAvailable: status.elevenLabsAvailable,
      grokVoiceAvailable: status.grokVoiceAvailable ?? false,
    });
  },

  // Error actions
  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Reset action
  resetVoiceState: () => {
    set({
      sessionId: null,
      sessionState: 'Idle' as VoiceSessionState,
      isConnecting: false,
      isConnected: false,
      isMicrophoneEnabled: true,
      isMuted: false,
      isAudioPlaying: false,
      audioLevel: 0,
      currentTranscript: '',
      currentAssistantTranscript: '',
      isTranscribing: false,
      transcriptHistory: [],
      error: null,
      // Clear agent state on reset
      toolExecutions: [],
      thinkingSteps: [],
      retrievedNotes: [],
      ragLogId: null,
      groundingSources: [],
      isToolExecuting: false,
      currentToolName: null,
    });
  },

  // Agent mode actions
  setAgentEnabled: (enabled: boolean) => {
    set({ agentEnabled: enabled });
  },

  setCapabilities: (capabilities: string[]) => {
    set({ capabilities });
  },

  addToolExecution: (execution: VoiceToolExecution) => {
    set((state) => ({
      toolExecutions: [...state.toolExecutions, execution],
      isToolExecuting: execution.status === 'executing',
      currentToolName: execution.status === 'executing' ? execution.toolName : state.currentToolName,
    }));
  },

  updateToolExecution: (toolId: string, updates: Partial<VoiceToolExecution>) => {
    set((state) => {
      const updatedExecutions = state.toolExecutions.map((t) =>
        t.toolId === toolId ? { ...t, ...updates } : t
      );
      const isStillExecuting = updatedExecutions.some((t) => t.status === 'executing');
      return {
        toolExecutions: updatedExecutions,
        isToolExecuting: isStillExecuting,
        currentToolName: isStillExecuting
          ? updatedExecutions.find((t) => t.status === 'executing')?.toolName ?? null
          : null,
      };
    });
  },

  addThinkingStep: (step: VoiceThinkingStep) => {
    set((state) => ({
      thinkingSteps: [...state.thinkingSteps, step],
    }));
  },

  setRetrievedNotes: (notes: VoiceRetrievedNote[], ragLogId?: string) => {
    set({
      retrievedNotes: notes,
      ragLogId: ragLogId ?? null,
    });
  },

  setGroundingSources: (sources: VoiceGroundingSource[]) => {
    set({ groundingSources: sources });
  },

  clearAgentState: () => {
    set({
      toolExecutions: [],
      thinkingSteps: [],
      retrievedNotes: [],
      ragLogId: null,
      groundingSources: [],
      isToolExecuting: false,
      currentToolName: null,
    });
  },

  // Grok Voice actions
  setVoiceProviderType: (providerType: VoiceProviderType) => {
    set({ voiceProviderType: providerType });
  },

  setSelectedGrokVoice: (voice: string) => {
    set({ selectedGrokVoice: voice });
  },

  setAvailableGrokVoices: (voices: GrokVoiceInfo[]) => {
    set({ availableGrokVoices: voices });
  },

  setEnableGrokWebSearch: (enabled: boolean) => {
    set({ enableGrokWebSearch: enabled });
  },

  setEnableGrokXSearch: (enabled: boolean) => {
    set({ enableGrokXSearch: enabled });
  },
});
