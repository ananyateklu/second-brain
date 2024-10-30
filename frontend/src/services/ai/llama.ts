import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';

export class LlamaService {
  private isEnabled = true;

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const response = await api.post('/api/llama/send', {
        prompt: message,
        modelName: modelId
      });

      return {
        content: response.data.content,
        type: 'text',
        metadata: {
          model: response.data.model,
        },
      };
    } catch (error) {
      console.error('Error communicating with Llama API:', error);
      throw new Error('Failed to get response from Llama.');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return [
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1',
        provider: 'llama',
        category: 'chat',
        description: 'Local Llama 3.1 model via Ollama',
        isConfigured: this.isConfigured(),
        color: '#FFB74D',
        endpoint: 'chat',
      },
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        provider: 'llama',
        category: 'chat',
        description: 'Local Llama 3.2 model via Ollama',
        isConfigured: this.isConfigured(),
        color: '#FFB74D',
        endpoint: 'chat',
      },
    ];
  }
} 