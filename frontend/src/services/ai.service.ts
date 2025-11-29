/**
 * AI Service
 * Handles AI provider health checks and model management
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS, getApiBaseUrl } from '../lib/constants';
import { useAuthStore } from '../store/auth-store';
import type {
  AIHealthResponse,
  AIProviderHealth,
  OllamaHealthOptions,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaPullCallbacks,
} from '../types/ai';

/**
 * AI service for provider health and model operations
 */
export const aiService = {
  /**
   * Get health status of all AI providers
   */
  async getHealth(options?: OllamaHealthOptions): Promise<AIHealthResponse> {
    const params = new URLSearchParams();
    
    if (options?.useRemoteOllama && options?.ollamaBaseUrl) {
      params.append('ollamaBaseUrl', options.ollamaBaseUrl);
      params.append('useRemoteOllama', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `${API_ENDPOINTS.AI.HEALTH}?${queryString}` : API_ENDPOINTS.AI.HEALTH;
    
    return apiClient.get<AIHealthResponse>(url);
  },

  /**
   * Get health status of a specific provider
   */
  async getProviderHealth(
    provider: string,
    options?: OllamaHealthOptions
  ): Promise<AIProviderHealth> {
    const params = new URLSearchParams();
    
    if (options?.useRemoteOllama && options?.ollamaBaseUrl) {
      params.append('ollamaBaseUrl', options.ollamaBaseUrl);
      params.append('useRemoteOllama', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString
      ? `${API_ENDPOINTS.AI.HEALTH_PROVIDER(provider)}?${queryString}`
      : API_ENDPOINTS.AI.HEALTH_PROVIDER(provider);
    
    return apiClient.get<AIProviderHealth>(url);
  },

  /**
   * Pull (download) an Ollama model with progress updates
   * Returns an AbortController for cancellation
   */
  pullModel(
    request: OllamaPullRequest,
    callbacks: OllamaPullCallbacks
  ): AbortController {
    const abortController = new AbortController();

    const startPull = async () => {
      const apiUrl = getApiBaseUrl();
      const authStore = useAuthStore.getState();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`;
      }

      try {
        const response = await fetch(`${apiUrl}${API_ENDPOINTS.AI.OLLAMA_PULL}`, {
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

        await this.processOllamaPullStream(reader, request.modelName, callbacks);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          callbacks.onError('Download cancelled');
        } else {
          callbacks.onError((error as Error).message || 'Failed to pull model');
        }
      }
    };

    startPull();
    return abortController;
  },

  /**
   * Process Ollama pull SSE stream
   */
  async processOllamaPullStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    modelName: string,
    callbacks: OllamaPullCallbacks
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr) {
            try {
              const progress: OllamaPullProgress = JSON.parse(jsonStr);
              callbacks.onProgress(progress);

              if (progress.isComplete) {
                callbacks.onComplete(modelName);
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
  },

  /**
   * Delete an Ollama model
   */
  async deleteModel(modelName: string, ollamaBaseUrl?: string | null): Promise<{ message: string }> {
    const params = new URLSearchParams();
    if (ollamaBaseUrl) {
      params.append('ollamaBaseUrl', ollamaBaseUrl);
    }
    
    const queryString = params.toString();
    const url = queryString
      ? `${API_ENDPOINTS.AI.OLLAMA_DELETE(modelName)}?${queryString}`
      : API_ENDPOINTS.AI.OLLAMA_DELETE(modelName);
    
    return apiClient.delete<{ message: string }>(url);
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Get healthy providers from health response
   */
  getHealthyProviders(health: AIHealthResponse): AIProviderHealth[] {
    return health.providers.filter((p) => p.isHealthy);
  },

  /**
   * Get unhealthy providers from health response
   */
  getUnhealthyProviders(health: AIHealthResponse): AIProviderHealth[] {
    return health.providers.filter((p) => !p.isHealthy);
  },

  /**
   * Check if any provider is healthy
   */
  hasHealthyProvider(health: AIHealthResponse): boolean {
    return health.providers.some((p) => p.isHealthy);
  },

  /**
   * Get models for a specific provider
   */
  getProviderModels(health: AIHealthResponse, provider: string): string[] {
    const providerHealth = health.providers.find(
      (p) => p.provider.toLowerCase() === provider.toLowerCase()
    );
    return providerHealth?.availableModels || [];
  },

  /**
   * Format response time for display
   */
  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  },

  /**
   * Get provider status color
   */
  getProviderStatusColor(provider: AIProviderHealth): string {
    if (provider.isHealthy) {
      return provider.responseTimeMs < 500 ? 'green' : 'yellow';
    }
    return 'red';
  },

  /**
   * Format bytes for download progress
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format download speed
   */
  formatSpeed(bytesPerSecond: number): string {
    return `${this.formatBytes(bytesPerSecond)}/s`;
  },

  /**
   * Format estimated time remaining
   */
  formatETA(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    }
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  },
};

