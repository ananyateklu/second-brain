import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../../services/api/api';

export class AnthropicService {
  private isEnabled = false;

  async testConnection(): Promise<boolean> {
    try {
      const response = await api.get('/api/Claude/test-connection');
      this.isEnabled = response.data.isConnected;
      return response.data.isConnected;
    } catch (error) {
      console.error('Error testing Claude connection:', error);
      return false;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    // API key is managed on the backend, just test the connection
    return this.testConnection();
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const request = {
        model: modelId,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      };

      const response = await api.post('/api/Claude/send', request);

      // Transform the response to match AIResponse interface
      return {
        content: response.data.content[0]?.text || '',
        type: 'text',
        metadata: {
          model: modelId,
          usage: {
            input_tokens: response.data.usage?.input_tokens || 0,
            output_tokens: response.data.usage?.output_tokens || 0,
          },
        },
      };
    } catch (error) {
      console.error('Error communicating with Claude API:', error);
      throw new Error('Failed to get response from Claude.');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'anthropic');
  }
}
