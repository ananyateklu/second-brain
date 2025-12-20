/**
 * useAudioRecorder Hook
 * Manages audio recording from the microphone with voice activity detection
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import {
  AudioRecorder,
  requestMicrophoneAccess,
  float32ToInt16,
  int16ToArrayBuffer,
} from '../../../services/voice-audio.service';

export interface UseAudioRecorderOptions {
  sampleRate?: number;
  onAudioData?: (data: ArrayBuffer) => void;
  onError?: (error: string) => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  error: string | null;
  start: (existingStream?: MediaStream) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { sampleRate = 16000, onAudioData, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onAudioDataRef = useRef(onAudioData);
  const onErrorRef = useRef(onError);

  // Keep callbacks up to date
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
    onErrorRef.current = onError;
  }, [onAudioData, onError]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await requestMicrophoneAccess(sampleRate);
      // Stop the stream immediately, we just wanted to check permission
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setHasPermission(false);
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      return false;
    }
  }, [sampleRate]);

  // Start recording (optionally with an existing stream)
  const start = useCallback(async (existingStream?: MediaStream): Promise<void> => {
    if (isRecording) return;

    try {
      setError(null);

      // Use existing stream or get a new one
      const stream = existingStream ?? await requestMicrophoneAccess(sampleRate);
      streamRef.current = stream;
      setHasPermission(true);

      // Create and configure recorder
      const recorder = new AudioRecorder({ sampleRate });
      recorderRef.current = recorder;

      // Set up audio data callback
      recorder.onData((float32Data) => {
        if (onAudioDataRef.current) {
          // Convert Float32 to Int16 PCM for transmission
          const int16Data = float32ToInt16(float32Data);
          const arrayBuffer = int16ToArrayBuffer(int16Data);
          onAudioDataRef.current(arrayBuffer);
        }
      });

      // Start recording
      await recorder.start(stream);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setHasPermission(false);
      onErrorRef.current?.(errorMessage);
      throw err;
    }
  }, [isRecording, sampleRate]);

  // Stop recording
  const stop = useCallback((): void => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // Pause recording
  const pause = useCallback((): void => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording]);

  // Resume recording
  const resume = useCallback((): void => {
    if (recorderRef.current && isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    hasPermission,
    error,
    start,
    stop,
    pause,
    resume,
    requestPermission,
  };
}
