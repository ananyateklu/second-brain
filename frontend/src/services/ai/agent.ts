import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';
import { AgentChat, AgentMessage } from '../../types/agent';
import { LlamaService } from './llama';
import { GrokService } from './grok';

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
  public llama = new LlamaService();
  public grokService = new GrokService();

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

  getAvailableModels(): AIModel[] {
    return AI_MODELS.filter(model =>
      model.category === 'agent' &&
      model.endpoint === 'agent'
    );
  }

  async isOpenAIConfigured(): Promise<boolean> {
    try {
      const response = await api.get('/api/AIAgents/openai/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Error checking OpenAI configuration:', error);
      return false;
    }
  }

  async isAnthropicConfigured(): Promise<boolean> {
    try {
      const response = await api.get('/api/AIAgents/anthropic/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Error checking Anthropic configuration:', error);
      return false;
    }
  }

  isGeminiConfigured(): boolean {
    // Add your Gemini configuration check logic here
    return true;
  }

  async sendMessage(
    message: string,
    modelId: string,
    chatId?: string,
    parameters?: AgentRequestParameters
  ): Promise<AIResponse> {
    try {
      console.log(`Sending message with chatId: ${chatId}`);
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