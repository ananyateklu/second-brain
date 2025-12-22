/**
 * Hook to fetch voice service status
 * Provides information about Deepgram (STT) and ElevenLabs (TTS) configuration status
 */

import { voiceService } from '../../../services/voice.service';
import { voiceKeys } from '../../../lib/query-keys';
import { useApiQuery } from '../../../hooks/use-api-query';
import type { VoiceServiceStatus } from '../types/voice-types';

/**
 * Query: Get voice service status
 * Returns the configuration and availability status of voice providers
 */
export function useVoiceStatus() {
  return useApiQuery<VoiceServiceStatus>(
    voiceKeys.status(),
    () => voiceService.getStatus(),
    {
      // Cache for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
    }
  );
}
