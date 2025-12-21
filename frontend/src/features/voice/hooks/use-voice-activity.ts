/**
 * useVoiceActivity Hook
 * Detects voice activity (speech start/end) and calculates audio levels
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { VoiceActivityDetector, createAnalyser, getAudioLevel } from '../../../services/voice-audio.service';

export interface UseVoiceActivityOptions {
  silenceThresholdMs?: number;
  energyThreshold?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSilence?: (durationMs: number) => void;
}

export interface UseVoiceActivityReturn {
  isSpeaking: boolean;
  audioLevel: number;
  silenceDuration: number;
  start: (stream: MediaStream) => void;
  stop: () => void;
  isActive: boolean;
}

export function useVoiceActivity(options: UseVoiceActivityOptions = {}): UseVoiceActivityReturn {
  const {
    silenceThresholdMs = 1500,
    energyThreshold = 0.01,
    onSpeechStart,
    onSpeechEnd,
    onSilence,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceDuration, setSilenceDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const analyserRef = useRef<{ audioContext: AudioContext; analyser: AnalyserNode } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSilenceRef = useRef(onSilence);

  // Keep callbacks up to date
  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
    onSilenceRef.current = onSilence;
  }, [onSpeechStart, onSpeechEnd, onSilence]);

  // Update audio level visualization
  const updateAudioLevel = useCallback((): void => {
    // Define the animation frame handler
    const tick = (): void => {
      // Early return if analyser is null - don't schedule next frame
      if (!analyserRef.current) {
        rafIdRef.current = null;
        return;
      }

      const level = getAudioLevel(analyserRef.current.analyser);
      setAudioLevel(level);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    tick();
  }, []);

  // Start voice activity detection
  const start = useCallback(
    (stream: MediaStream): void => {
      // Stop any existing detection
      if (vadRef.current) {
        vadRef.current.stop();
      }
      if (analyserRef.current) {
        void analyserRef.current.audioContext.close();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Create VAD with callbacks
      vadRef.current = new VoiceActivityDetector(
        {
          onSpeechStart: () => {
            setIsSpeaking(true);
            setSilenceDuration(0);
            onSpeechStartRef.current?.();
          },
          onSpeechEnd: () => {
            setIsSpeaking(false);
            onSpeechEndRef.current?.();
          },
          onSilence: (durationMs: number) => {
            setSilenceDuration(durationMs);
            onSilenceRef.current?.(durationMs);
          },
        },
        silenceThresholdMs,
        energyThreshold
      );

      // Create analyser for audio level visualization
      analyserRef.current = createAnalyser(stream);

      // Start detection and visualization
      vadRef.current.start(stream);
      setIsActive(true);
      updateAudioLevel();
    },
    [silenceThresholdMs, energyThreshold, updateAudioLevel]
  );

  // Stop voice activity detection
  const stop = useCallback((): void => {
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }

    if (analyserRef.current) {
      void analyserRef.current.audioContext.close();
      analyserRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setIsSpeaking(false);
    setAudioLevel(0);
    setSilenceDuration(0);
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        vadRef.current.stop();
      }
      if (analyserRef.current) {
        void analyserRef.current.audioContext.close();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    isSpeaking,
    audioLevel,
    silenceDuration,
    start,
    stop,
    isActive,
  };
}
