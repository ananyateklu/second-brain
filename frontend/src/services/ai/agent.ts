import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AgentChat, AgentMessage } from '../../types/agent';
import { OllamaService } from './ollama';
import { GrokService } from './grok';
import { modelService } from './modelService';

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

interface HealthCheckResponse {
  status: string;
  providers: {
    openai?: { isConfigured: boolean };
    anthropic?: { isConfigured: boolean };
    gemini?: { isConfigured: boolean };
    ollama?: { isConfigured: boolean };
    grok?: { isConfigured: boolean };
  };
}

export class AgentService {
  private isEnabled = true;
  public ollama = new OllamaService();
  public grokService = new GrokService();
  private healthCheckCache: { data: HealthCheckResponse; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  private async getHealthCheck(forceRefresh = false): Promise<HealthCheckResponse> {
    // Return cached result if available and not expired
    if (!forceRefresh && this.healthCheckCache &&
      (Date.now() - this.healthCheckCache.timestamp) < this.CACHE_DURATION) {
      return this.healthCheckCache.data;
    }

    try {
      const response = await api.get('/api/AIAgents/health');
      this.healthCheckCache = {
        data: response.data,
        timestamp: Date.now()
      };
      return response.data;
    } catch (error) {
      console.error('Error getting health check:', error);
      throw error;
    }
  }

  async getProviderConfigurations(forceRefresh = false): Promise<{
    openai: boolean;
    anthropic: boolean;
    gemini: boolean;
    ollama: boolean;
    grok: boolean;
  }> {
    const healthData = await this.getHealthCheck(forceRefresh);
    return {
      openai: healthData.providers?.openai?.isConfigured ?? false,
      anthropic: healthData.providers?.anthropic?.isConfigured ?? false,
      gemini: healthData.providers?.gemini?.isConfigured ?? false,
      ollama: healthData.providers?.ollama?.isConfigured ?? true,
      grok: healthData.providers?.grok?.isConfigured ?? false
    };
  }

  async testConnection(forceRefresh = false): Promise<boolean> {
    try {
      const healthData = await this.getHealthCheck(forceRefresh);
      this.isEnabled = healthData.status === 'healthy';
      return this.isEnabled;
    } catch (error) {
      console.error('Error testing agent connection:', error);
      return false;
    }
  }

  getAvailableModels(): AIModel[] {
    return modelService.getAgentModels();
  }

  async isOpenAIConfigured(forceRefresh = false): Promise<boolean> {
    const configs = await this.getProviderConfigurations(forceRefresh);
    return configs.openai;
  }

  async isAnthropicConfigured(forceRefresh = false): Promise<boolean> {
    const configs = await this.getProviderConfigurations(forceRefresh);
    return configs.anthropic;
  }

  async isGeminiConfigured(forceRefresh = false): Promise<boolean> {
    const configs = await this.getProviderConfigurations(forceRefresh);
    return configs.gemini;
  }

  async isOllamaConfigured(forceRefresh = false): Promise<boolean> {
    const configs = await this.getProviderConfigurations(forceRefresh);
    return configs.ollama;
  }

  async isGrokConfigured(forceRefresh = false): Promise<boolean> {
    const configs = await this.getProviderConfigurations(forceRefresh);
    return configs.grok;
  }

  async sendMessage(
    message: string,
    modelId: string,
    chatId?: string,
    parameters?: AgentRequestParameters
  ): Promise<AIResponse> {
    try {
      const baseModelId = modelId.replace('-agent', '');
      const response = await api.post('/api/AIAgents/execute', {
        prompt: message,
        modelId: baseModelId,
        chatId: chatId,
        maxTokens: parameters?.max_tokens ?? 1000,
        temperature: parameters?.temperature ?? 0.7,
        tools: parameters?.tools ?? []
      });

      return {
        content: response.data.content,
        type: response.data.type || 'text',
        metadata: response.data.metadata || {},
        executionSteps: response.data.metadata?.execution_steps || []
      };
    } catch (error) {
      console.error('Error executing agent:', error);
      throw new Error('Failed to execute agent. Please try again.');
    }
  }

  async transcribeAudio(file: File): Promise<AIResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/api/AIAgents/transcribe', formData);
      return {
        content: response.data.text,
        type: 'text',
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  // Chat history methods
  async loadChats(): Promise<AgentChat[]> {
    try {
      const response = await api.get('/api/AgentChats');
      return response.data;
    } catch (error) {
      console.error('Error loading chats:', error);
      throw error;
    }
  }

  async createChat(modelId: string, title?: string): Promise<AgentChat> {
    try {
      const response = await api.post('/api/AgentChats', {
        modelId,
        title
      });
      return response.data;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  async addMessage(chatId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage> {
    try {
      const response = await api.post(`/api/AgentChats/${chatId}/messages`, message);
      return response.data;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      await api.delete(`/api/AgentChats/${chatId}`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  // Tool creation methods
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

export const agentService = new AgentService(); 