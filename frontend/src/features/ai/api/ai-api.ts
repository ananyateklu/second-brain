import { apiClient } from '../../../lib/api-client';
import { AIHealthResponse, AIProviderHealth } from '../types/ai-health';

export const aiApi = {
  async getHealth(): Promise<AIHealthResponse> {
    return apiClient.get<AIHealthResponse>('/ai/health');
  },

  async getProviderHealth(provider: string): Promise<AIProviderHealth> {
    return apiClient.get<AIProviderHealth>(`/ai/health/${provider}`);
  },
};
