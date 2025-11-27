import { apiClient } from '../../../lib/api-client';
import { AIHealthResponse, AIProviderHealth } from '../types/ai-health';

export interface OllamaHealthOptions {
  ollamaBaseUrl?: string | null;
  useRemoteOllama?: boolean;
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
};
