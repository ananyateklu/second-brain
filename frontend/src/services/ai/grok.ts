import { AIModel, AIResponse, GrokFunction } from '../../types/ai';
import api from '../api/api';
import { agentService } from './agent';

export class GrokService {
  private isEnabled = false;

  async checkConfiguration(): Promise<boolean> {
    try {
      const isConfigured = await agentService.isGrokConfigured();
      this.isEnabled = isConfigured;
      return isConfigured;
    } catch (error) {
      console.error('Error checking Grok configuration:', error);
      return false;
    }
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
        model: modelId,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        stream: false,
        max_tokens: parameters?.max_tokens,
        temperature: parameters?.temperature ?? 0,
        top_p: parameters?.top_p ?? 1,
        frequency_penalty: parameters?.frequency_penalty ?? 0,
        presence_penalty: parameters?.presence_penalty ?? 0
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

  async executeFunctionCall(
    message: string,
    modelId: string,
    functions: GrokFunction[]
  ): Promise<AIResponse> {
    try {
      const request = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: message,
            toolCalls: [],
            toolCallId: ""
          }
        ],
        tools: functions,
        stream: false,
        temperature: 0
      };

      const response = await api.post('/api/Grok/function-call', request);

      return {
        content: response.data.choices[0].message.content,
        type: 'text',
        metadata: {
          model: modelId,
          usage: response.data.usage,
          toolCalls: response.data.choices[0].message.toolCalls
        }
      };
    } catch (error) {
      console.error('Error executing function call with Grok:', error);
      throw new Error('Failed to execute function call with Grok.');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await api.get('/api/Grok/models');
      const data: Array<{ id: string }> = response.data;
      return data.map(m => ({
        id: m.id,
        name: m.id,
        provider: 'grok',
        category: 'chat',
        description: m.id,
        isReasoner: false,
        isConfigured: this.isConfigured(),
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {}
      }));
    } catch (error) {
      console.error('Error fetching Grok models:', error);
      // Fallback to default model
      return [
        {
          id: 'grok-beta',
          name: 'Grok Beta',
          provider: 'grok',
          category: 'chat',
          description: 'Grok Beta - Fallback model',
          isReasoner: false,
          isConfigured: this.isConfigured(),
          color: '#1DA1F2',
          endpoint: 'chat',
          rateLimits: {}
        }
      ];
    }
  }
}