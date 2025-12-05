/**
 * Hook to load and manage Tauri secrets
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '../../lib/native-notifications';
import { getSecrets, type Secrets } from '../../lib/tauri-bridge';

// Map provider IDs to their secret keys
const PROVIDER_SECRET_KEYS: Record<string, keyof Secrets> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  google: 'gemini_api_key',
  xai: 'xai_api_key',
  ollama: 'ollama_base_url',
};

export function useTauriSecrets() {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadSecrets = useCallback(async () => {
    if (!isTauri()) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const loadedSecrets = await getSecrets();
      setSecrets(loadedSecrets);
    } catch (error) {
      console.error('Failed to load secrets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const isProviderConfigured = useCallback((providerId: string): boolean => {
    const secretKey = PROVIDER_SECRET_KEYS[providerId];
    if (!secretKey) return true; // Unknown provider, assume configured
    const value = secrets[secretKey];
    // For Ollama, empty is OK (uses default local)
    if (providerId === 'ollama') return true;
    return !!value && value.trim() !== '';
  }, [secrets]);

  return { secrets, isLoading, isProviderConfigured, refetch: loadSecrets };
}
