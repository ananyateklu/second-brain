/**
 * Voice Slice Tests
 * Unit tests for voice agent session state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVoiceSlice } from '../voice-slice';
import type { VoiceSlice, BoundStore } from '../../types';
import type {
  VoiceToolExecution,
  VoiceThinkingStep,
  VoiceRetrievedNote,
  VoiceGroundingSource,
  VoiceInfo,
  GrokVoiceInfo,
  VoiceSessionSummary,
} from '../../../features/voice/types/voice-types';

// Mock voice-utils with actual state mappings
vi.mock('../../../features/voice/utils/voice-utils', () => ({
  normalizeState: vi.fn((state: string | number) => {
    if (typeof state === 'number') {
      // Match actual numericToStringState from voice-utils.ts
      const states: Record<number, string> = {
        0: 'Idle',
        1: 'Listening',
        2: 'Processing',
        3: 'Speaking',
        4: 'Interrupted',
        5: 'Ended',
      };
      return states[state] ?? 'Idle';
    }
    return state;
  }),
}));

describe('voiceSlice', () => {
  let state: Partial<BoundStore>;
  let slice: VoiceSlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();
    state = {};
    // @ts-expect-error - Partial store mock
    slice = createVoiceSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have correct default session state', () => {
      expect(slice.sessionId).toBeNull();
      expect(slice.sessionState).toBe('Idle');
      expect(slice.isConnecting).toBe(false);
      expect(slice.isConnected).toBe(false);
    });

    it('should have correct default audio controls', () => {
      expect(slice.isMicrophoneEnabled).toBe(true);
      expect(slice.isMuted).toBe(false);
      expect(slice.isAudioPlaying).toBe(false);
      expect(slice.audioLevel).toBe(0);
    });

    it('should have correct default transcript state', () => {
      expect(slice.currentTranscript).toBe('');
      expect(slice.currentAssistantTranscript).toBe('');
      expect(slice.isTranscribing).toBe(false);
      expect(slice.transcriptHistory).toEqual([]);
    });

    it('should have correct default settings', () => {
      expect(slice.selectedProvider).toBeNull();
      expect(slice.selectedModel).toBeNull();
      expect(slice.selectedVoiceId).toBeNull();
      expect(slice.availableVoices).toEqual([]);
    });

    it('should have correct default service status', () => {
      expect(slice.isServiceAvailable).toBe(false);
      expect(slice.deepgramAvailable).toBe(false);
      expect(slice.elevenLabsAvailable).toBe(false);
      expect(slice.grokVoiceAvailable).toBe(false);
    });

    it('should have correct default Grok Voice settings', () => {
      expect(slice.voiceProviderType).toBe('GrokVoice');
      expect(slice.selectedGrokVoice).toBe('ara');
      expect(slice.availableGrokVoices).toEqual([]);
      expect(slice.enableGrokWebSearch).toBe(true);
      expect(slice.enableGrokXSearch).toBe(true);
    });

    it('should have correct default agent state', () => {
      expect(slice.agentEnabled).toBe(true);
      expect(slice.capabilities).toEqual(['notes-crud', 'notes-search']);
      expect(slice.voiceRagEnabled).toBe(true);
      expect(slice.toolExecutions).toEqual([]);
      expect(slice.thinkingSteps).toEqual([]);
      expect(slice.retrievedNotes).toEqual([]);
      expect(slice.ragLogId).toBeNull();
      expect(slice.groundingSources).toEqual([]);
      expect(slice.isToolExecuting).toBe(false);
      expect(slice.currentToolName).toBeNull();
    });

    it('should have correct default sidebar state', () => {
      expect(slice.voiceSidebarVisible).toBe(true);
      expect(slice.sessionHistory).toEqual([]);
      expect(slice.selectedHistoricalSessionId).toBeNull();
      expect(slice.isLoadingHistory).toBe(false);
    });

    it('should have null error by default', () => {
      expect(slice.error).toBeNull();
    });
  });

  // ============================================
  // Session Actions Tests
  // ============================================
  describe('session actions', () => {
    it('should set session ID', () => {
      slice.setSessionId('session-123');
      expect(state.sessionId).toBe('session-123');
    });

    it('should clear session ID', () => {
      state.sessionId = 'session-123';
      slice.setSessionId(null);
      expect(state.sessionId).toBeNull();
    });

    it('should set session state from string', () => {
      slice.setSessionState('Processing');
      expect(state.sessionState).toBe('Processing');
    });

    it('should set session state from number', () => {
      slice.setSessionState(2);
      expect(state.sessionState).toBe('Processing');
    });

    it('should set isConnecting', () => {
      slice.setIsConnecting(true);
      expect(state.isConnecting).toBe(true);
    });

    it('should set isConnected', () => {
      slice.setIsConnected(true);
      expect(state.isConnected).toBe(true);
    });
  });

  // ============================================
  // Audio Control Actions Tests
  // ============================================
  describe('audio control actions', () => {
    it('should set microphone enabled', () => {
      slice.setMicrophoneEnabled(false);
      expect(state.isMicrophoneEnabled).toBe(false);
    });

    it('should toggle microphone', () => {
      state.isMicrophoneEnabled = true;
      slice.toggleMicrophone();
      expect(state.isMicrophoneEnabled).toBe(false);

      slice.toggleMicrophone();
      expect(state.isMicrophoneEnabled).toBe(true);
    });

    it('should set muted', () => {
      slice.setMuted(true);
      expect(state.isMuted).toBe(true);
    });

    it('should toggle mute', () => {
      state.isMuted = false;
      slice.toggleMute();
      expect(state.isMuted).toBe(true);

      slice.toggleMute();
      expect(state.isMuted).toBe(false);
    });

    it('should set audio playing', () => {
      slice.setAudioPlaying(true);
      expect(state.isAudioPlaying).toBe(true);
    });

    it('should set audio level', () => {
      slice.setAudioLevel(0.75);
      expect(state.audioLevel).toBe(0.75);
    });
  });

  // ============================================
  // Transcript Actions Tests
  // ============================================
  describe('transcript actions', () => {
    it('should set current transcript', () => {
      slice.setCurrentTranscript('Hello world');
      expect(state.currentTranscript).toBe('Hello world');
    });

    it('should set current assistant transcript', () => {
      slice.setCurrentAssistantTranscript('Hi there');
      expect(state.currentAssistantTranscript).toBe('Hi there');
    });

    it('should set isTranscribing', () => {
      slice.setIsTranscribing(true);
      expect(state.isTranscribing).toBe(true);
    });

    it('should add user transcript entry', () => {
      slice.addTranscriptEntry('user', 'Hello');
      expect(state.transcriptHistory).toHaveLength(1);
      expect(state.transcriptHistory?.[0]?.role).toBe('user');
      expect(state.transcriptHistory?.[0]?.content).toBe('Hello');
      expect(state.transcriptHistory?.[0]?.timestamp).toBeDefined();
    });

    it('should add assistant transcript entry with agent data', () => {
      const agentData = {
        toolExecutions: [{ toolId: 't1', toolName: 'SearchNotes', status: 'completed' as const, timestamp: Date.now() }],
        thinkingSteps: [{ content: 'Thinking...', timestamp: Date.now() }],
        durationMs: 1500,
      };

      slice.addTranscriptEntry('assistant', 'Here are your notes', agentData);
      expect(state.transcriptHistory).toHaveLength(1);
      expect(state.transcriptHistory?.[0]?.role).toBe('assistant');
      expect(state.transcriptHistory?.[0]?.toolExecutions).toEqual(agentData.toolExecutions);
      expect(state.transcriptHistory?.[0]?.thinkingSteps).toEqual(agentData.thinkingSteps);
      expect(state.transcriptHistory?.[0]?.durationMs).toBe(1500);
    });

    it('should limit transcript history to 100 entries', () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        slice.addTranscriptEntry('user', `Message ${i}`);
      }
      expect(state.transcriptHistory?.length).toBe(100);
      // First entry should be Message 5 (not Message 0-4)
      expect(state.transcriptHistory?.[0]?.content).toBe('Message 5');
    });

    it('should clear transcript history', () => {
      state.transcriptHistory = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ];
      state.currentTranscript = 'Some text';
      state.currentAssistantTranscript = 'Some response';

      slice.clearTranscriptHistory();
      expect(state.transcriptHistory).toEqual([]);
      expect(state.currentTranscript).toBe('');
      expect(state.currentAssistantTranscript).toBe('');
    });
  });

  // ============================================
  // Settings Actions Tests
  // ============================================
  describe('settings actions', () => {
    it('should set selected provider', () => {
      slice.setSelectedProvider('deepgram');
      expect(state.selectedProvider).toBe('deepgram');
    });

    it('should set selected model', () => {
      slice.setSelectedModel('nova-2');
      expect(state.selectedModel).toBe('nova-2');
    });

    it('should set selected voice ID', () => {
      slice.setSelectedVoiceId('voice-123');
      expect(state.selectedVoiceId).toBe('voice-123');
    });

    it('should set available voices', () => {
      const voices: VoiceInfo[] = [
        { voiceId: 'v1', name: 'Voice 1' },
        { voiceId: 'v2', name: 'Voice 2' },
      ];
      slice.setAvailableVoices(voices);
      expect(state.availableVoices).toEqual(voices);
    });
  });

  // ============================================
  // Service Status Actions Tests
  // ============================================
  describe('service status actions', () => {
    it('should set service status with all providers available', () => {
      slice.setServiceStatus({
        deepgramAvailable: true,
        elevenLabsAvailable: true,
        voiceAgentEnabled: true,
        grokVoiceAvailable: true,
      });

      expect(state.isServiceAvailable).toBe(true);
      expect(state.deepgramAvailable).toBe(true);
      expect(state.elevenLabsAvailable).toBe(true);
      expect(state.grokVoiceAvailable).toBe(true);
    });

    it('should be available with standard providers', () => {
      slice.setServiceStatus({
        deepgramAvailable: true,
        elevenLabsAvailable: true,
        voiceAgentEnabled: true,
        grokVoiceAvailable: false,
      });

      expect(state.isServiceAvailable).toBe(true);
    });

    it('should be available with only Grok', () => {
      slice.setServiceStatus({
        deepgramAvailable: false,
        elevenLabsAvailable: false,
        voiceAgentEnabled: true,
        grokVoiceAvailable: true,
      });

      expect(state.isServiceAvailable).toBe(true);
    });

    it('should not be available when voice agent disabled', () => {
      slice.setServiceStatus({
        deepgramAvailable: true,
        elevenLabsAvailable: true,
        voiceAgentEnabled: false,
        grokVoiceAvailable: true,
      });

      expect(state.isServiceAvailable).toBe(false);
    });

    it('should handle missing grokVoiceAvailable', () => {
      slice.setServiceStatus({
        deepgramAvailable: true,
        elevenLabsAvailable: true,
        voiceAgentEnabled: true,
      });

      expect(state.grokVoiceAvailable).toBe(false);
    });
  });

  // ============================================
  // Error Actions Tests
  // ============================================
  describe('error actions', () => {
    it('should set error', () => {
      slice.setError('Connection failed');
      expect(state.error).toBe('Connection failed');
    });

    it('should clear error', () => {
      state.error = 'Some error';
      slice.clearError();
      expect(state.error).toBeNull();
    });
  });

  // ============================================
  // Reset Action Tests
  // ============================================
  describe('reset action', () => {
    it('should reset voice state but preserve transcript history', () => {
      // Set up various state
      state.sessionId = 'session-123';
      state.isConnected = true;
      state.isMuted = true;
      state.audioLevel = 0.5;
      state.currentTranscript = 'Hello';
      state.error = 'Some error';
      state.toolExecutions = [{ toolId: 't1', toolName: 'Test', status: 'completed' }] as VoiceToolExecution[];
      state.transcriptHistory = [{ role: 'user', content: 'Hello', timestamp: Date.now() }];

      slice.resetVoiceState();

      // Should be reset
      expect(state.sessionId).toBeNull();
      expect(state.isConnected).toBe(false);
      expect(state.isMuted).toBe(false);
      expect(state.audioLevel).toBe(0);
      expect(state.currentTranscript).toBe('');
      expect(state.error).toBeNull();
      expect(state.toolExecutions).toEqual([]);

      // Should be preserved
      expect(state.transcriptHistory).toHaveLength(1);
    });
  });

  // ============================================
  // Agent Mode Actions Tests
  // ============================================
  describe('agent mode actions', () => {
    it('should set agent enabled', () => {
      slice.setAgentEnabled(false);
      expect(state.agentEnabled).toBe(false);
    });

    it('should set capabilities', () => {
      slice.setCapabilities(['notes', 'web-search']);
      expect(state.capabilities).toEqual(['notes', 'web-search']);
    });

    it('should set voice RAG enabled', () => {
      slice.setVoiceRagEnabled(false);
      expect(state.voiceRagEnabled).toBe(false);
    });

    it('should add tool execution', () => {
      const execution: VoiceToolExecution = {
        toolId: 'tool-1',
        toolName: 'SearchNotes',
        status: 'executing',
        timestamp: Date.now(),
      };

      slice.addToolExecution(execution);
      expect(state.toolExecutions).toHaveLength(1);
      expect(state.isToolExecuting).toBe(true);
      expect(state.currentToolName).toBe('SearchNotes');
    });

    it('should update tool execution', () => {
      state.toolExecutions = [{
        toolId: 'tool-1',
        toolName: 'SearchNotes',
        status: 'executing',
        timestamp: Date.now(),
      }] as VoiceToolExecution[];
      state.isToolExecuting = true;
      state.currentToolName = 'SearchNotes';

      slice.updateToolExecution('tool-1', { status: 'completed', result: 'Found 3 notes' });

      expect(state.toolExecutions?.[0]?.status).toBe('completed');
      expect(state.toolExecutions?.[0]?.result).toBe('Found 3 notes');
      expect(state.isToolExecuting).toBe(false);
      expect(state.currentToolName).toBeNull();
    });

    it('should add thinking step', () => {
      const step: VoiceThinkingStep = {
        content: 'Analyzing request...',
        timestamp: Date.now(),
      };

      slice.addThinkingStep(step);
      expect(state.thinkingSteps).toHaveLength(1);
      expect(state.thinkingSteps?.[0]?.content).toBe('Analyzing request...');
    });

    it('should set retrieved notes with ragLogId', () => {
      const notes: VoiceRetrievedNote[] = [
        { noteId: 'n1', title: 'Note 1', preview: 'Preview 1', tags: [], relevanceScore: 0.9 },
      ];

      slice.setRetrievedNotes(notes, 'rag-123');
      expect(state.retrievedNotes).toEqual(notes);
      expect(state.ragLogId).toBe('rag-123');
    });

    it('should set retrieved notes without ragLogId', () => {
      const notes: VoiceRetrievedNote[] = [
        { noteId: 'n1', title: 'Note 1', preview: 'Preview 1', tags: [], relevanceScore: 0.9 },
      ];

      slice.setRetrievedNotes(notes);
      expect(state.retrievedNotes).toEqual(notes);
      expect(state.ragLogId).toBeNull();
    });

    it('should set grounding sources', () => {
      const sources: VoiceGroundingSource[] = [
        { uri: 'https://example.com', title: 'Example' },
      ];

      slice.setGroundingSources(sources);
      expect(state.groundingSources).toEqual(sources);
    });

    it('should clear agent state', () => {
      state.toolExecutions = [{ toolId: 't1', toolName: 'Test', status: 'completed', timestamp: Date.now() }] as VoiceToolExecution[];
      state.thinkingSteps = [{ content: 'Test', timestamp: Date.now() }] as VoiceThinkingStep[];
      state.retrievedNotes = [{ noteId: 'n1', title: 'Test', preview: '', tags: [], relevanceScore: 0.5 }];
      state.ragLogId = 'rag-123';
      state.groundingSources = [{ uri: 'https://test.com', title: 'Test' }];
      state.isToolExecuting = true;
      state.currentToolName = 'Test';

      slice.clearAgentState();

      expect(state.toolExecutions).toEqual([]);
      expect(state.thinkingSteps).toEqual([]);
      expect(state.retrievedNotes).toEqual([]);
      expect(state.ragLogId).toBeNull();
      expect(state.groundingSources).toEqual([]);
      expect(state.isToolExecuting).toBe(false);
      expect(state.currentToolName).toBeNull();
    });
  });

  // ============================================
  // Grok Voice Actions Tests
  // ============================================
  describe('Grok Voice actions', () => {
    it('should set voice provider type', () => {
      slice.setVoiceProviderType('Standard');
      expect(state.voiceProviderType).toBe('Standard');
    });

    it('should set selected Grok voice', () => {
      slice.setSelectedGrokVoice('zephyr');
      expect(state.selectedGrokVoice).toBe('zephyr');
    });

    it('should set available Grok voices', () => {
      const voices: GrokVoiceInfo[] = [
        { voiceId: 'ara', name: 'Ara', description: 'Default voice' },
        { voiceId: 'zephyr', name: 'Zephyr', description: 'Alternative voice' },
      ];

      slice.setAvailableGrokVoices(voices);
      expect(state.availableGrokVoices).toEqual(voices);
    });

    it('should set enable Grok web search', () => {
      slice.setEnableGrokWebSearch(false);
      expect(state.enableGrokWebSearch).toBe(false);
    });

    it('should set enable Grok X search', () => {
      slice.setEnableGrokXSearch(false);
      expect(state.enableGrokXSearch).toBe(false);
    });
  });

  // ============================================
  // Sidebar and History Actions Tests
  // ============================================
  describe('sidebar and history actions', () => {
    it('should toggle voice sidebar', () => {
      state.voiceSidebarVisible = true;
      slice.toggleVoiceSidebar();
      expect(state.voiceSidebarVisible).toBe(false);

      slice.toggleVoiceSidebar();
      expect(state.voiceSidebarVisible).toBe(true);
    });

    it('should set voice sidebar visible', () => {
      slice.setVoiceSidebarVisible(false);
      expect(state.voiceSidebarVisible).toBe(false);
    });

    it('should set session history', () => {
      const sessions: VoiceSessionSummary[] = [
        { id: 's1', provider: 'Standard', model: 'nova-2', startedAt: new Date().toISOString(), status: 'ended', turnCount: 5, totalAudioDurationMs: 10000, totalInputTokens: 100, totalOutputTokens: 200 },
        { id: 's2', provider: 'GrokVoice', model: 'grok-2', startedAt: new Date().toISOString(), status: 'active', turnCount: 3, totalAudioDurationMs: 5000, totalInputTokens: 50, totalOutputTokens: 100 },
      ];

      slice.setSessionHistory(sessions);
      expect(state.sessionHistory).toEqual(sessions);
    });

    it('should set selected historical session ID', () => {
      slice.setSelectedHistoricalSessionId('session-456');
      expect(state.selectedHistoricalSessionId).toBe('session-456');
    });

    it('should clear selected historical session ID', () => {
      state.selectedHistoricalSessionId = 'session-456';
      slice.setSelectedHistoricalSessionId(null);
      expect(state.selectedHistoricalSessionId).toBeNull();
    });

    it('should set is loading history', () => {
      slice.setIsLoadingHistory(true);
      expect(state.isLoadingHistory).toBe(true);
    });
  });
});
