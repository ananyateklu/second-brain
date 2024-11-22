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
      console.log('Sending message with model:', modelId, 'parameters:', parameters); // Debug log
      
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

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'gemini');
  }
}
