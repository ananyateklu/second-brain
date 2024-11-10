import { AIModel, AIResponse, ExecutionStep } from '../../types/ai';
import api from '../api/api';
import { signalRService } from '../../services/signalR';

export class LlamaService {
  private isEnabled = true;

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const messageId = Date.now().toString();
      let finalContent = '';

      const eventSource = new EventSource(
        `${api.defaults.baseURL}/api/llama/stream?prompt=${encodeURIComponent(message)}&modelId=${modelId}`
      );

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.Type === 'content') {
              finalContent += data.Content;
            } else if (data.Type === 'step' && data.Content && !data.Content.includes('Processing request')) {
              if (!data.Metadata?.type?.includes('processing') && 
                  !data.Metadata?.type?.includes('thinking') &&
                  !data.Metadata?.type?.includes('function_call') &&
                  !data.Metadata?.type?.includes('database_operation')) {
                finalContent += data.Content;
              }
            }
          } catch (error) {
            if (!event.data.includes('"Type":"step"')) {
              finalContent += event.data;
            }
          }
        };

        eventSource.onerror = (error) => {
          eventSource.close();
          if (finalContent) {
            resolve({
              content: finalContent.trim(),
              type: 'text',
              metadata: {
                model: modelId,
                messageId
              }
            });
          } else {
            reject(new Error('Stream ended without content'));
          }
        };

        eventSource.addEventListener('complete', () => {
          eventSource.close();
          resolve({
            content: finalContent.trim(),
            type: 'text',
            metadata: {
              model: modelId,
              messageId
            }
          });
        });
      });

    } catch (error) {
      console.error('Error communicating with Llama API:', error);
      throw new Error('Failed to get response from Llama.');
    }
  }

  async executeDatabaseOperation(prompt: string, messageId: string): Promise<AIResponse> {
    try {
      const steps: ExecutionStep[] = [];

      // Subscribe to execution steps for this messageId
      const unsubscribe = signalRService.onExecutionStep((step: ExecutionStep) => {
        if (step.metadata?.messageId === messageId) {
          steps.push(step);
          // Optionally, trigger UI updates here if necessary
        }
      });

      // Send prompt and messageId to backend
      const response = await api.post('/api/nexusstorage/execute', { prompt, messageId });

      // Unsubscribe after operation completes
      unsubscribe();

      return {
        content: response.data.content,
        type: 'text',
        executionSteps: steps,
        metadata: {
          model: 'nexusraven',
        },
      };
    } catch (error: any) {
      console.error('Error executing database operation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to execute database operation.';
      throw new Error(`${errorMessage} Raw response: ${error.response?.data?.rawResponse || 'N/A'}`);
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
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        provider: 'llama',
        category: 'chat',
        description: 'Local Llama 3.2 model via Ollama',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'codegemma',
        name: 'Code Gemma',
        provider: 'llama',
        category: 'chat',
        description: 'Local Code Gemma model (7b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',

      },
      {
        id: 'gemma2:9b',
        name: 'Gemma 2 (9b)',
        provider: 'llama',
        category: 'chat',
        description: 'Local Gemma 2 model (9b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'gemma2:2b',
        name: 'Gemma 2 (2b)',
        provider: 'llama',
        category: 'chat',
        description: 'Local Gemma 2 model (2b parameters) from Google via Ollama',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'nemotron-mini',
        name: 'Nemotron Mini',
        provider: 'llama',
        category: 'chat',
        description: 'Local Nemotron Mini model (1.3b parameters) from Nvidia via Ollama',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'Mistral-nemo',
        name: 'Mistral Nemo',
        provider: 'llama',
        category: 'chat',
        description: 'Mistral Nemo - Mistral\'s latest 7b parameter model',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'starcoder2:7b',
        name: 'Star Coder 2 ',
        provider: 'llama',
        category: 'chat',
        description: 'Mistral Nemo - Mistral\'s latest 7b parameter model',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'orca2',
        name: 'Orca 2',
        provider: 'llama',
        category: 'chat',
        description: 'Orca 2 is built by Microsoft research, and are a fine-tuned version of Meta\'s Llama 2 models. The model is designed to excel particularly in reasoning.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'samantha-mistral',
        name: 'Samantha Mistral',
        provider: 'llama',
        category: 'chat',
        description: 'A companion assistant trained in philosophy, psychology, and personal relationships. Based on Mistral.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'nexusraven',
        name: 'Nexus Raven (Tool Calling)',
        provider: 'llama',
        category: 'function',
        description: 'Nexus Raven is a model designed to excel in function calling, and is optimized for database operations.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'granite3-dense:8b',
        name: 'Granite 3 Dense',
        provider: 'llama',
        category: 'chat',
        description: 'The IBM Granite 2B and 8B models are designed to support tool-based use cases and support for retrieval augmented generation (RAG), streamlining code generation, translation and bug fixing.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'granite3-moe',
        name: 'Granite 3 MOE',
        provider: 'llama',
        category: 'chat',
        description: 'The IBM Granite 1B and 3B models are the first mixture of experts (MoE) Granite models from IBM designed for low latency usage.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'qwen2.5-coder',
        name: 'Qwen 2.5 Coder',
        provider: 'llama',
        category: 'chat',
        description: 'The latest series of Code-Specific Qwen models, with significant improvements in code generation, code reasoning, and code fixing.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'phi3.5',
        name: 'Phi 3.5',
        provider: 'llama',
        category: 'chat',
        description: 'A lightweight AI model with 3.8 billion parameters with performance overtaking similarly and larger sized models.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'opencoder:8b',
        name: 'OpenCoder 8b',
        provider: 'llama',
        category: 'chat',
        description: 'OpenCoder is an open and reproducible code LLM family which includes 1.5B and 8B models, supporting both chat and fill-in-the-middle for English and Chinese languages.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'opencoder:1.5b',
        name: 'OpenCoder 1.5b',
        provider: 'llama',
        category: 'chat',
        description: 'OpenCoder is an open and reproducible code LLM family which includes 1.5B and 8B models, supporting both chat and fill-in-the-middle for English and Chinese languages.',
        isConfigured: this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
      {
        id: 'yi-coder',
        name: 'Yi Coder',
        provider: 'llama',
        category: 'chat',
        description: 'Yi-Coder is a series of open-source code language models that delivers state-of-the-art coding performance with fewer than 10 billion parameters.',
        isConfigured:  this.isConfigured(),
        color: '#8B5CF6',
        endpoint: 'chat',
      },
    ];
  }
} 