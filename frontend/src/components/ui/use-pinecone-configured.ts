/**
 * Hook to check if Pinecone is configured
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '../../lib/native-notifications';
import { getSecrets } from '../../lib/tauri-bridge';

export function usePineconeConfigured() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkConfiguration = useCallback(async () => {
    if (!isTauri()) {
      setIsConfigured(true); // Assume configured in web mode
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const secrets = await getSecrets();
      const configured = !!(
        secrets.pinecone_api_key?.trim() &&
        secrets.pinecone_index_name?.trim()
      );
      setIsConfigured(configured);
    } catch {
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  return { isConfigured, isLoading, refetch: checkConfiguration };
}
