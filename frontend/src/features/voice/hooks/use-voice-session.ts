/**
 * useVoiceSession Hook
 * Main composite hook for voice agent sessions
 * Orchestrates recording, playback, WebSocket communication, and state management
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import { voiceService, VoiceWebSocketConnection, type VoiceWebSocketCallbacks } from '../../../services/voice.service';
import { requestMicrophoneAccess } from '../../../services/voice-audio.service';
import { useAudioRecorder } from './use-audio-recorder';
import { useAudioPlayer } from './use-audio-player';
import { useVoiceActivity } from './use-voice-activity';
import type {
  VoiceSessionOptions,
  VoiceSessionState,
  VoiceRetrievedNote,
  VoiceGroundingSource,
} from '../types/voice-types';
import { MetadataEvents } from '../types/voice-types';

export interface UseVoiceSessionOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceSessionState | number) => void;
  onError?: (error: string) => void;
  /** Sample rate for audio capture. Grok Voice uses 24kHz, standard uses 16kHz */
  sampleRate?: number;
}

export interface UseVoiceSessionReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  sessionState: VoiceSessionState;
  isMicrophoneEnabled: boolean;
  isAudioPlaying: boolean;
  audioLevel: number;
  currentTranscript: string;
  currentAssistantTranscript: string;
  transcriptHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  error: string | null;

  // Actions
  startSession: (options: VoiceSessionOptions) => Promise<void>;
  endSession: () => Promise<void>;
  interrupt: () => void;
  toggleMicrophone: () => void;
  clearError: () => void;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}): UseVoiceSessionReturn {
  const { onTranscript, onStateChange, onError, sampleRate = 16000 } = options;

  // Store state and actions
  const {
    sessionId,
    sessionState,
    isConnecting,
    isConnected,
    isMicrophoneEnabled,
    isAudioPlaying,
    audioLevel,
    currentTranscript,
    currentAssistantTranscript,
    transcriptHistory,
    error,
    agentEnabled: _agentEnabled,
    capabilities: _capabilities,
    setSessionId,
    setSessionState,
    setIsConnecting,
    setIsConnected,
    setMicrophoneEnabled,
    setAudioPlaying,
    setAudioLevel,
    setCurrentTranscript,
    setCurrentAssistantTranscript,
    setIsTranscribing,
    addTranscriptEntry,
    clearTranscriptHistory,
    setError,
    clearError,
    resetVoiceState,
    // Agent actions
    addToolExecution,
    updateToolExecution,
    addThinkingStep,
    setRetrievedNotes,
    setGroundingSources,
    clearAgentState: _clearAgentState,
  } = useBoundStore();

  // WebSocket connection ref
  const wsConnectionRef = useRef<VoiceWebSocketConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Callback refs
  const onTranscriptRef = useRef(onTranscript);
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  // State refs for audio callback (to avoid stale closures)
  const isMicrophoneEnabledRef = useRef(isMicrophoneEnabled);
  const isAudioPlayingRef = useRef(isAudioPlaying);
  const isConnectedRef = useRef(isConnected);

  // Track if we've started recording after connection
  const [_hasStartedRecording, setHasStartedRecording] = useState(false);

  // Keep callback refs up to date
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onStateChangeRef.current = onStateChange;
    onErrorRef.current = onError;
  }, [onTranscript, onStateChange, onError]);

  // Keep state refs up to date (critical for audio callback)
  useEffect(() => {
    isMicrophoneEnabledRef.current = isMicrophoneEnabled;
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    isAudioPlayingRef.current = isAudioPlaying;
  }, [isAudioPlaying]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Audio player - handle TTS audio playback
  const audioPlayer = useAudioPlayer({
    sampleRate,
    onPlaybackStart: () => {
      setAudioPlaying(true);
      setSessionState('Speaking');
    },
    onPlaybackEnd: () => {
      setAudioPlaying(false);
      // Return to listening if session is active
      // Use refs to get current state values (avoids stale closure issue)
      if (isConnectedRef.current && isMicrophoneEnabledRef.current) {
        setSessionState('Listening');
      }
    },
    onError: (err) => {
      console.error('Audio player error:', err);
    },
  });

  // Audio recorder - capture microphone audio
  const audioRecorder = useAudioRecorder({
    sampleRate,
    onAudioData: (data) => {
      // Send audio data through WebSocket
      // Use refs to get current state values (avoids stale closure issue)
      if (wsConnectionRef.current?.isConnected && isMicrophoneEnabledRef.current && !isAudioPlayingRef.current) {
        wsConnectionRef.current.sendRawAudio(data);
      }
    },
    onError: (err) => {
      setError(err);
      onErrorRef.current?.(err);
    },
  });

  // Voice activity detection
  const voiceActivity = useVoiceActivity({
    silenceThresholdMs: 1500,
    energyThreshold: 0.01,
    onSpeechStart: () => {
      // Use refs to get current state values (avoids stale closure issue)
      if (isConnectedRef.current && !isAudioPlayingRef.current) {
        setSessionState('Listening');
        setIsTranscribing(true);
      }
    },
    onSpeechEnd: () => {
      // Use refs to get current state values (avoids stale closure issue)
      if (isConnectedRef.current && !isAudioPlayingRef.current) {
        setSessionState('Processing');
      }
    },
  });

  // Update audio level from voice activity
  useEffect(() => {
    setAudioLevel(voiceActivity.audioLevel);
  }, [voiceActivity.audioLevel, setAudioLevel]);

  // WebSocket callbacks
  const createWebSocketCallbacks = useCallback((): VoiceWebSocketCallbacks => {
    return {
      onConnected: () => {
        setIsConnected(true);
        setIsConnecting(false);
        setSessionState('Idle');
      },
      onDisconnected: (reason) => {
        setIsConnected(false);
        setSessionState('Ended');
        audioRecorder.stop();
        voiceActivity.stop();
        if (reason && reason !== 'Client disconnect') {
          setError(`Disconnected: ${reason}`);
        }
      },
      onStateChange: (state, reason) => {
        setSessionState(state);
        onStateChangeRef.current?.(state);
        if (reason) {
          console.log('State change reason:', reason);
        }
      },
      onTranscript: (text, isFinal, _confidence) => {
        setCurrentTranscript(text);
        onTranscriptRef.current?.(text, isFinal);

        if (isFinal && text.trim()) {
          addTranscriptEntry('user', text);
          setCurrentTranscript('');
        }
      },
      onAudioChunk: (audioData, _sequence, _isFinal, sampleRate) => {
        // Pass sample rate from server (24kHz for Grok Voice, 16kHz for standard)
        audioPlayer.queueAudio(audioData, sampleRate);
      },
      onError: (code, message, recoverable) => {
        const errorMsg = `${code}: ${message}`;
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);

        if (!recoverable) {
          setSessionState('Ended');
        }
      },
      onMetadata: (event, data) => {
        console.log('Voice metadata:', event, data);

        switch (event) {
          // AI response streaming - show text as it's being generated
          case MetadataEvents.AI_RESPONSE_CHUNK:
            if (data?.fullText) {
              setCurrentAssistantTranscript(data.fullText as string);
            }
            break;

          // AI response completion - add to history and clear streaming text
          case MetadataEvents.AI_RESPONSE_END:
            if (data?.content) {
              addTranscriptEntry('assistant', data.content as string);
              setCurrentAssistantTranscript('');
            }
            break;

          // Tool execution started
          case MetadataEvents.TOOL_CALL_START:
            addToolExecution({
              toolId: data?.toolId as string,
              toolName: data?.toolName as string,
              arguments: data?.arguments as string,
              status: 'executing',
              timestamp: Date.now(),
            });
            break;

          // Tool execution completed
          case MetadataEvents.TOOL_CALL_END:
            updateToolExecution(data?.toolId as string, {
              result: data?.result as string,
              status: data?.success ? 'completed' : 'failed',
            });
            break;

          // Thinking step from agent
          case MetadataEvents.THINKING_STEP:
            addThinkingStep({
              content: data?.content as string,
              timestamp: Date.now(),
            });
            break;

          // RAG context retrieval
          case MetadataEvents.CONTEXT_RETRIEVAL:
            setRetrievedNotes(
              (data?.notes as VoiceRetrievedNote[]) ?? [],
              data?.ragLogId as string
            );
            break;

          // Grounding sources (web search results)
          case MetadataEvents.GROUNDING_SOURCES: {
            const sources: VoiceGroundingSource[] = [];
            if (data?.sources) {
              sources.push(...(data.sources as VoiceGroundingSource[]));
            }
            if (data?.grokSearchSources) {
              sources.push(...(data.grokSearchSources as VoiceGroundingSource[]));
            }
            if (sources.length > 0) {
              setGroundingSources(sources);
            }
            break;
          }

          // Agent status update
          case MetadataEvents.AGENT_STATUS:
            console.log('Agent status:', data?.message);
            break;

          default:
            // Log unhandled events for debugging
            console.log('Unhandled voice metadata event:', event, data);
        }
      },
    };
  }, [
    setIsConnected,
    setIsConnecting,
    setSessionState,
    setCurrentTranscript,
    setCurrentAssistantTranscript,
    setError,
    addTranscriptEntry,
    audioPlayer,
    audioRecorder,
    voiceActivity,
    addToolExecution,
    updateToolExecution,
    addThinkingStep,
    setRetrievedNotes,
    setGroundingSources,
  ]);

  // Start a voice session
  const startSession = useCallback(
    async (sessionOptions: VoiceSessionOptions): Promise<void> => {
      if (isConnecting || isConnected) {
        return;
      }

      try {
        setIsConnecting(true);
        setError(null);
        clearTranscriptHistory();

        // Request microphone access first (with appropriate sample rate)
        const stream = await requestMicrophoneAccess(sampleRate);
        streamRef.current = stream;

        // Create session on backend
        const result = await voiceService.createSession(sessionOptions);
        setSessionId(result.sessionId);

        // Create WebSocket connection
        const callbacks = createWebSocketCallbacks();
        const wsConnection = voiceService.createWebSocketConnection(result.sessionId, callbacks);
        wsConnectionRef.current = wsConnection;

        // Connect WebSocket
        await wsConnection.connect();

        // Start recording and voice activity detection
        await audioRecorder.start(stream);
        voiceActivity.start(stream);
        setHasStartedRecording(true);

        // Send start control to begin listening
        wsConnection.sendControl('start');
        setSessionState('Listening');
        setMicrophoneEnabled(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start voice session';
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        setIsConnecting(false);
        resetVoiceState();
        throw err;
      }
    },
    [
      isConnecting,
      isConnected,
      setIsConnecting,
      setError,
      clearTranscriptHistory,
      setSessionId,
      createWebSocketCallbacks,
      audioRecorder,
      voiceActivity,
      setSessionState,
      setMicrophoneEnabled,
      resetVoiceState,
      sampleRate,
    ]
  );

  // End the voice session
  const endSession = useCallback(async (): Promise<void> => {
    try {
      // Stop recording
      audioRecorder.stop();
      voiceActivity.stop();
      audioPlayer.stop();
      setHasStartedRecording(false);

      // Stop microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Send stop control and disconnect WebSocket
      if (wsConnectionRef.current) {
        wsConnectionRef.current.sendControl('stop');
        wsConnectionRef.current.disconnect();
        wsConnectionRef.current = null;
      }

      // End session on backend
      if (sessionId) {
        try {
          await voiceService.endSession(sessionId);
        } catch {
          // Ignore errors when ending session
        }
      }

      resetVoiceState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end voice session';
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    }
  }, [sessionId, audioRecorder, voiceActivity, audioPlayer, resetVoiceState, setError]);

  // Interrupt AI response
  const interrupt = useCallback((): void => {
    if (wsConnectionRef.current?.isConnected) {
      wsConnectionRef.current.sendControl('interrupt');
      audioPlayer.stop();
      setAudioPlaying(false);
      setSessionState('Listening');
    }
  }, [audioPlayer, setAudioPlaying, setSessionState]);

  // Toggle microphone
  const toggleMic = useCallback((): void => {
    const newState = !isMicrophoneEnabled;
    setMicrophoneEnabled(newState);

    if (wsConnectionRef.current?.isConnected) {
      wsConnectionRef.current.sendControl(newState ? 'unmute' : 'mute');
    }

    if (newState) {
      audioRecorder.resume();
    } else {
      audioRecorder.pause();
    }
  }, [isMicrophoneEnabled, setMicrophoneEnabled, audioRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsConnectionRef.current) {
        wsConnectionRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    // State
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

    // Actions
    startSession,
    endSession,
    interrupt,
    toggleMicrophone: toggleMic,
    clearError,
  };
}
