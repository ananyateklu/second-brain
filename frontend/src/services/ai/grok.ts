import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';

export class GrokService {
  private isEnabled = false;

  async checkConfiguration(): Promise<boolean> {
    try {
      const response = await api.get('/api/Grok/test-connection');
      this.isEnabled = response.data.isConnected;
      return response.data.isConnected;
    } catch (error) {
      console.error('Error checking Grok configuration:', error);
      return false;
    }
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const request = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        stream: false,
        temperature: 0
      };

      const response = await api.post('/api/Grok/send', request);

      return {
        content: response.data.choices[0].message.content,
        type: 'text',
        metadata: {
          model: modelId,
          usage: response.data.usage
        }
      };
    } catch (error) {
      console.error('Error communicating with Grok API:', error);
      throw new Error('Failed to get response from Grok.');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return [
      {
        id: 'grok-beta',
        name: 'Grok Beta',
        provider: 'grok',
        category: 'chat',
        description: 'Grok Beta - Comparable performance to Grok 2 but with improved efficiency, speed and capabilities',
        isConfigured: this.isConfigured(),
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
          tpm: 100000,
          rpm: 500,
          rpd: 10000,
          tpd: 1000000,
        },
      }
    ];
  }
} 