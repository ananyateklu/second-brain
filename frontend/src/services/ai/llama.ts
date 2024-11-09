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
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        provider: 'llama',
        category: 'chat',
        description: 'Local Llama 3.2 model via Ollama',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'codegemma',
        name: 'Code Gemma',
        provider: 'llama',
        category: 'chat',
        description: 'Local Code Gemma model (7b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',

      },
      {
        id: 'gemma2:9b',
        name: 'Gemma 2 (9b)',
        provider: 'llama',
        category: 'chat',
        description: 'Local Gemma 2 model (9b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'gemma2:2b',
        name: 'Gemma 2 (2b)',
        provider: 'llama',
        category: 'chat',
        description: 'Local Gemma 2 model (2b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'nemotron-mini',
        name: 'Nemotron Mini',
        provider: 'llama',
        category: 'chat',
        description: 'Local Nemotron Mini model (1.3b parameters) from Nvidia via Ollama',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'Mistral-nemo',
        name: 'Mistral Nemo',
        provider: 'llama',
        category: 'chat',
        description: 'Mistral Nemo - Mistral\'s latest 7b parameter model',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'starcoder2:7b',
        name: 'Star Coder 2 ',
        provider: 'llama',
        category: 'chat',
        description: 'Mistral Nemo - Mistral\'s latest 7b parameter model',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'orca2',
        name: 'Orca 2',
        provider: 'llama',
        category: 'chat',
        description: 'Orca 2 is built by Microsoft research, and are a fine-tuned version of Meta\'s Llama 2 models. The model is designed to excel particularly in reasoning.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'samantha-mistral',
        name: 'Samantha Mistral',
        provider: 'llama',
        category: 'chat',
        description: 'A companion assistant trained in philosophy, psychology, and personal relationships. Based on Mistral.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'nexusraven',
        name: 'Nexus Raven (Tool Calling)',
        provider: 'llama',
        category: 'function',
        description: 'Nexus Raven is a model designed to excel in function calling, and is optimized for database operations.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'granite3-dense:8b',
        name: 'Granite 3 Dense',
        provider: 'llama',
        category: 'chat',
        description: 'The IBM Granite 2B and 8B models are designed to support tool-based use cases and support for retrieval augmented generation (RAG), streamlining code generation, translation and bug fixing.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'granite3-moe',
        name: 'Granite 3 MOE',
        provider: 'llama',
        category: 'chat',
        description: 'The IBM Granite 1B and 3B models are the first mixture of experts (MoE) Granite models from IBM designed for low latency usage.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'qwen2.5-coder',
        name: 'Qwen 2.5 Coder',
        provider: 'llama',
        category: 'chat',
        description: 'The latest series of Code-Specific Qwen models, with significant improvements in code generation, code reasoning, and code fixing.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      },
      {
        id: 'phi3.5',
        name: 'Phi 3.5',
        provider: 'llama',
        category: 'chat',
        description: 'A lightweight AI model with 3.8 billion parameters with performance overtaking similarly and larger sized models.',
        isConfigured: this.isConfigured(),
        color: '#D3C5E5',
        endpoint: 'chat',
      }
    ];
  }

  async executeDatabaseOperation(prompt: string): Promise<AIResponse> {
    try {
      // First try the test endpoint to see raw response
      const testResponse = await api.post('/api/nexusstorage/test', prompt);
      console.log('Raw model response:', testResponse.data.rawResponse);

      // Then try the actual operation
      const response = await api.post('/api/nexusstorage/execute', prompt);

      return {
        content: response.data.content,
        type: 'text',
        metadata: {
          model: 'nexusraven',
          rawResponse: testResponse.data.rawResponse // Include raw response for debugging
        },
      };
    } catch (error) {
      console.error('Error executing database operation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to execute database operation.';
      throw new Error(`${errorMessage} Raw response: ${error.response?.data?.rawResponse || 'N/A'}`);
    }
  }
} 