import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';

interface AgentRequestParameters {
  max_tokens?: number;
  temperature?: number;
}

export class AgentService {
  private isEnabled = true;

  async testConnection(): Promise<boolean> {
    try {
      const response = await api.get('/api/AIAgents/health');
      this.isEnabled = response.data.status === 'healthy';
      return this.isEnabled;
    } catch (error) {
      console.error('Error testing agent connection:', error);
      return false;
    }
  }

  async sendMessage(
    message: string,
    modelId: string,
    parameters?: AgentRequestParameters
  ): Promise<AIResponse> {
    try {
      console.log('Executing agent with model:', modelId);
      const baseModelId = modelId.replace('-agent', '');

      const response = await api.post('/api/AIAgents/execute', {
        prompt: message,
        modelId: baseModelId,
        maxTokens: parameters?.max_tokens ?? 1000,
        temperature: parameters?.temperature ?? 0.7,
        tools: []
      });

      console.log('Agent response:', response.data);

      return {
        content: response.data.result,
        type: 'text',
        metadata: response.data.metadata,
        executionSteps: []
      };
    } catch (error) {
      console.error('Error executing agent:', error);
      throw new Error('Failed to execute agent. Please try again.');
    }
  }

  async isConfigured(): Promise<boolean> {
    try {
      const isConnected = await this.testConnection();
      this.isEnabled = isConnected;
      return isConnected;
    } catch (error) {
      console.error('[AgentService] Configuration error:', error);
      this.isEnabled = false;
      return false;
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.category === 'agent');
  }
} 