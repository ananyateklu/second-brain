import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { AIHealthResponse, AIProviderHealth } from '../types/ai-health';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api';

export interface OllamaHealthOptions {
  ollamaBaseUrl?: string | null;
  useRemoteOllama?: boolean;
}

export interface OllamaPullRequest {
  modelName: string;
  ollamaBaseUrl?: string | null;
  insecure?: boolean;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  totalBytes?: number;
  completedBytes?: number;
  percentage?: number;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number;
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface OllamaPullCallbacks {
  onProgress: (progress: OllamaPullProgress) => void;
  onComplete: (modelName: string) => void;
  onError: (error: string) => void;
}

export const aiApi = {
  async getHealth(options?: OllamaHealthOptions): Promise<AIHealthResponse> {
    const params = new URLSearchParams();
    
    if (options?.useRemoteOllama && options?.ollamaBaseUrl) {
      params.append('ollamaBaseUrl', options.ollamaBaseUrl);
      params.append('useRemoteOllama', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `/ai/health?${queryString}` : '/ai/health';
    
    return apiClient.get<AIHealthResponse>(url);
  },

  async getProviderHealth(provider: string, options?: OllamaHealthOptions): Promise<AIProviderHealth> {
    const params = new URLSearchParams();
    
    if (options?.useRemoteOllama && options?.ollamaBaseUrl) {
      params.append('ollamaBaseUrl', options.ollamaBaseUrl);
      params.append('useRemoteOllama', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `/ai/health/${provider}?${queryString}` : `/ai/health/${provider}`;
    
    return apiClient.get<AIProviderHealth>(url);
  },

  /**
   * Pull (download) an Ollama model with real-time progress updates via SSE.
   * Returns an AbortController that can be used to cancel the download.
   */
  pullModel(
    request: OllamaPullRequest,
    callbacks: OllamaPullCallbacks
  ): AbortController {
    const abortController = new AbortController();

    const startPull = async () => {
      const authStore = useAuthStore.getState();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/ai/ollama/pull`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          callbacks.onError(errorText || `HTTP ${response.status}: ${response.statusText}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError('No response stream available');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                try {
                  const progress: OllamaPullProgress = JSON.parse(jsonStr);
                  callbacks.onProgress(progress);

                  if (progress.isComplete) {
                    callbacks.onComplete(request.modelName);
                    return;
                  }

                  if (progress.isError) {
                    callbacks.onError(progress.errorMessage || 'Unknown error during model pull');
                    return;
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE message:', { jsonStr, parseError });
                }
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          callbacks.onError('Download cancelled');
        } else {
          callbacks.onError((error as Error).message || 'Failed to pull model');
        }
      }
    };

    // Start the pull operation
    startPull();

    return abortController;
  },

  /**
   * Delete an Ollama model from the local or remote instance.
   */
  async deleteModel(modelName: string, ollamaBaseUrl?: string | null): Promise<{ message: string }> {
    const params = new URLSearchParams();
    if (ollamaBaseUrl) {
      params.append('ollamaBaseUrl', ollamaBaseUrl);
    }
    
    const queryString = params.toString();
    const url = queryString 
      ? `/ai/ollama/models/${encodeURIComponent(modelName)}?${queryString}` 
      : `/ai/ollama/models/${encodeURIComponent(modelName)}`;
    
    return apiClient.delete<{ message: string }>(url);
  },
};
