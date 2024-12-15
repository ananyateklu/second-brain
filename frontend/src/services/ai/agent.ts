import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';

interface AgentRequestParameters {
  max_tokens?: number;
  temperature?: number;
  tools?: AgentTool[];
}

export interface AgentTool {
  name: string;
  type: string;
  description: string;
  parameters?: Record<string, unknown>;
  required_permissions?: string[];
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
        tools: parameters?.tools ?? []
      });

      console.log('Agent response:', response.data);

      return {
        content: response.data.result,
        type: 'text',
        metadata: response.data.metadata,
        executionSteps: response.data.metadata?.execution_steps ?? []
      };
    } catch (error) {
      console.error('Error executing agent:', error);
      throw new Error('Failed to execute agent. Please try again.');
    }
  }

  async executeBatch(requests: { 
    prompt: string; 
    modelId: string; 
    parameters?: AgentRequestParameters;
  }[]): Promise<AIResponse[]> {
    try {
      const response = await api.post('/api/AIAgents/batch', requests.map(req => ({
        prompt: req.prompt,
        modelId: req.modelId.replace('-agent', ''),
        maxTokens: req.parameters?.max_tokens ?? 1000,
        temperature: req.parameters?.temperature ?? 0.7,
        tools: req.parameters?.tools ?? []
      })));

      return response.data.responses.map((res: any) => ({
        content: res.result,
        type: 'text',
        metadata: res.metadata,
        executionSteps: res.metadata?.execution_steps ?? []
      }));
    } catch (error) {
      console.error('Error executing batch requests:', error);
      throw new Error('Failed to execute batch requests. Please try again.');
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
    return AI_MODELS.filter(model => 
      model.category === 'agent' && 
      // Ensure we're getting the agent versions of models
      model.endpoint === 'agent'
    );
  }

  // Helper method to create common tools
  createTool(
    name: string,
    type: string,
    description: string,
    parameters?: Record<string, unknown>,
    required_permissions?: string[]
  ): AgentTool {
    return {
      name,
      type,
      description,
      parameters,
      required_permissions
    };
  }

  // Predefined tools
  readonly COMMON_TOOLS = {
    webSearch: () => this.createTool(
      'web_search',
      'api_call',
      'Search the web for information',
      { max_results: 5 }
    ),
    
    databaseQuery: (query: string) => this.createTool(
      'database_query',
      'database_query',
      'Query the database for information',
      { query }
    ),
    
    fileOperation: (path: string, operation: 'read' | 'write') => this.createTool(
      'file_operation',
      'file_operation',
      `${operation} file at specified path`,
      { path, operation },
      ['file_access']
    )
  };
} 