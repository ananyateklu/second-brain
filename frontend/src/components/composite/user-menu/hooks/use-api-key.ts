import { useState, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { toast } from '../../../../hooks/use-toast';

interface UseApiKeyReturn {
  isGenerating: boolean;
  newApiKey: string | null;
  generateApiKey: () => Promise<void>;
  copyApiKey: (apiKey: string) => void;
  resetNewApiKey: () => void;
}

export function useApiKey(): UseApiKeyReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const generateApiKey = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.post<{ apiKey: string; generatedAt: string }>(
        '/auth/generate-api-key'
      );
      setNewApiKey(response.apiKey);
      toast.success('API key generated successfully');
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const copyApiKey = useCallback((apiKey: string) => {
    void navigator.clipboard.writeText(apiKey).catch((error: unknown) => {
      console.error('Failed to copy API key:', error);
      toast.error('Failed to copy API key');
    });
    toast.success('API key copied to clipboard');
  }, []);

  const resetNewApiKey = useCallback(() => {
    setNewApiKey(null);
  }, []);

  return {
    isGenerating,
    newApiKey,
    generateApiKey,
    copyApiKey,
    resetNewApiKey,
  };
}
