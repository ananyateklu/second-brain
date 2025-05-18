import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AI_MODELS } from './models';

export class GeminiService {
  isConfigured(): boolean {
    return true; // Configuration is handled by backend
  }

  async sendMessage(
    message: string,
    modelId: string,
    parameters?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    }
  ): Promise<AIResponse> {
    try {

      const request = {
        message,
        modelId,
        parameters: {
          maxOutputTokens: parameters?.max_tokens,
          temperature: parameters?.temperature,
          topP: parameters?.top_p,
          // Note: Gemini doesn't support frequency_penalty and presence_penalty,
          // so we'll omit them from the request
        }
      };

      const response = await api.post('/api/gemini/chat', request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        content: response.data.content.content,
        type: 'text',
        metadata: {
          model: modelId,
          parameters: parameters // Include the parameters in metadata for debugging
        }
      };
    } catch (error: unknown) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private handleError(error: Error): never {
    console.error('Gemini Error:', error);
    throw new Error(error?.message || 'An unexpected error occurred');
  }

  /**
   * Fetch Gemini models from backend. Falls back to static list on error.
   */
  async getModels(): Promise<AIModel[]> {
    try {
      const response = await api.get<{
        models: Array<{
          name: string;
          version: string;
          displayName: string;
          description: string;
          inputTokenLimit: number;
          outputTokenLimit: number;
          supportedGenerationMethods: string[];
        }>
      }>('/api/gemini/models');
      return response.data.models.map(m => {
        // m.name is "models/{modelId}"
        const id = m.name.split('/')[1] || m.name;
        return {
          id,
          name: m.displayName || id,
          provider: 'gemini',
          category: 'chat',
          description: m.description,
          isConfigured: this.isConfigured(),
          isReasoner: false,
          color: '#4285F4',
          endpoint: 'chat',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportsFunctionCalling: (m.supportedGenerationMethods?.length ?? 0) > 0,
          supportsStreaming: true,
          rateLimits: {}
        } as AIModel;
      });
    } catch (error) {
      console.error('Error fetching Gemini models from backend:', error);
      // Fallback to static configuration
      return AI_MODELS.filter(model => model.provider === 'gemini');
    }
  }
}
