import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AI_MODELS } from './models';

export class GeminiService {
  isConfigured(): boolean {
    return true; // Configuration is handled by backend
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      console.log('Sending message with model:', modelId); // Debug log
      
      const response = await api.post('/api/gemini/chat', {
        message,
        modelId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        content: response.data.content.content,
        type: 'text',
      };
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any): never {
    console.error('Gemini Error:', error);
    throw new Error(error?.message || 'An unexpected error occurred');
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'gemini');
  }
}
