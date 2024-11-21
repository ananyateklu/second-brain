import { AIModel, AIResponse, ExecutionStep } from '../../types/ai';
import api from '../api/api';
import { signalRService } from '../../services/signalR';
import { AI_MODELS } from './models';

export class LlamaService {
  private isEnabled = true;

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const messageId = Date.now().toString();
      let finalContent = '';

      console.log(`[LlamaService] Sending message - Model: ${modelId}, Message: ${message}`);

      if (modelId.includes('function')) {
        // For function-calling models, use executeDatabaseOperation
        return this.executeDatabaseOperation(message, messageId, modelId);
      }

      const eventSource = new EventSource(
        `${api.defaults.baseURL}/api/llama/stream?prompt=${encodeURIComponent(message)}&modelId=${modelId}`
      );

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received event data:', data);

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
          } catch (_error) {
            console.log('Raw event data:', event.data);
            if (!event.data.includes('"Type":"step"')) {
              finalContent += event.data;
            }
          }
        };

        eventSource.onerror = (_error) => {
          eventSource.close();
          if (finalContent) {
            resolve({
              content: finalContent.trim(),
              type: 'text',
              metadata: {
                model: modelId
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
              model: modelId
            }
          });
        });
      });

    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  async executeDatabaseOperation(prompt: string, messageId: string, modelId: string): Promise<AIResponse> {
    try {
      const steps: ExecutionStep[] = [];
      console.log(`[LlamaService] Executing operation with model: ${modelId}`);

      // Subscribe to execution steps
      const unsubscribe = signalRService.onExecutionStep((step: ExecutionStep) => {
        if (step.metadata?.messageId === messageId) {
          console.log(`[LlamaService] Received step for ${modelId}:`, step);
          steps.push(step);
        }
      });

      // Add model identifier to prompt
      const augmentedPrompt = `[MODEL:${modelId}] ${prompt}`;

      // Send request
      const response = await api.post('/api/nexusstorage/execute', {
        prompt: augmentedPrompt,
        messageId,
        modelId
      });

      unsubscribe();

      return {
        content: response.data.content,
        type: 'text',
        executionSteps: steps,
        metadata: {
          model: modelId,
        },
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; rawResponse?: string } } };
      console.error(`[LlamaService] Error executing ${modelId} operation:`, err);
      const errorMessage = err.response?.data?.error || 'Failed to execute operation.';
      throw new Error(`${errorMessage} Raw response: ${err.response?.data?.rawResponse || 'N/A'}`);
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    // Filter models from AI_MODELS that are from the 'llama' provider
    return AI_MODELS.filter(model => model.provider === 'llama').map(model => ({
      ...model,
      isConfigured: this.isConfigured()  // Ensure we use the local isConfigured state
    }));
  }
} 