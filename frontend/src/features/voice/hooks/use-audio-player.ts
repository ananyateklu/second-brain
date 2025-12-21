/**
 * useAudioPlayer Hook
 * Manages audio playback queue for streaming TTS audio
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { AudioPlayer } from '../../../services/voice-audio.service';

export interface UseAudioPlayerOptions {
  sampleRate?: number;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  queueLength: number;
  error: string | null;
  queueAudio: (audioData: ArrayBuffer, sampleRate?: number) => void;
  stop: () => void;
  clear: () => void;
  init: () => Promise<void>;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const { sampleRate = 16000, onPlaybackStart, onPlaybackEnd, onError } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const onPlaybackStartRef = useRef(onPlaybackStart);
  const onPlaybackEndRef = useRef(onPlaybackEnd);
  const onErrorRef = useRef(onError);
  const wasPlayingRef = useRef(false);

  // Keep callbacks up to date
  useEffect(() => {
    onPlaybackStartRef.current = onPlaybackStart;
    onPlaybackEndRef.current = onPlaybackEnd;
    onErrorRef.current = onError;
  }, [onPlaybackStart, onPlaybackEnd, onError]);

  // Initialize player
  const init = useCallback(async (): Promise<void> => {
    try {
      if (!playerRef.current) {
        const player = new AudioPlayer({ sampleRate });
        playerRef.current = player;

        // Set up ended callback
        player.onEnded(() => {
          setIsPlaying(false);
          setQueueLength(0);
          wasPlayingRef.current = false;
          onPlaybackEndRef.current?.();
        });

        await player.init();
      }
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio player';
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      throw err;
    }
  }, [sampleRate]);

  // Queue audio for playback
  const queueAudio = useCallback((audioData: ArrayBuffer, audioSampleRate?: number): void => {
    if (!playerRef.current) {
      // Auto-initialize if not already done
      const player = new AudioPlayer({ sampleRate });
      playerRef.current = player;

      player.onEnded(() => {
        setIsPlaying(false);
        setQueueLength(0);
        wasPlayingRef.current = false;
        onPlaybackEndRef.current?.();
      });

      player.init().catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio player';
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      });
    }

    try {
      // Pass sample rate to audio player (uses provided rate or falls back to default)
      playerRef.current.queueAudio(audioData, audioSampleRate);
      setQueueLength((prev) => prev + 1);

      // Notify when playback starts
      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true;
        setIsPlaying(true);
        onPlaybackStartRef.current?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to queue audio';
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    }
  }, [sampleRate]);

  // Stop playback
  const stop = useCallback((): void => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
      setQueueLength(0);
      wasPlayingRef.current = false;
    }
  }, []);

  // Clear queue without stopping current playback
  const clear = useCallback((): void => {
    if (playerRef.current) {
      playerRef.current.stop();
      setQueueLength(0);
      wasPlayingRef.current = false;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        void playerRef.current.close();
      }
    };
  }, []);

  return {
    isPlaying,
    queueLength,
    error,
    queueAudio,
    stop,
    clear,
    init,
  };
}
