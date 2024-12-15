import { AIModel, AIResponse, ExecutionStep } from '../../types/ai';
import api from '../api/api';
import { signalRService } from '../../services/signalR';
import { AI_MODELS } from './models';

export class LlamaService {
  private readonly isEnabled = true;

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
      const messageId = Date.now().toString();
      let finalContent = '';

      console.log(`[LlamaService] Sending message - Model: ${modelId}, Message: ${message}`);

      if (modelId.includes('function')) {
        // For function-calling models, use executeDatabaseOperation
        return this.executeDatabaseOperation(message, messageId, modelId);
      }

      // Build query parameters including the model parameters
      const queryParams = new URLSearchParams({
        prompt: message,
        modelId: modelId,
        ...(parameters?.max_tokens && { max_tokens: parameters.max_tokens.toString() }),
        ...(parameters?.temperature !== undefined && { temperature: parameters.temperature.toString() }),
        ...(parameters?.top_p !== undefined && { top_p: parameters.top_p.toString() }),
        ...(parameters?.frequency_penalty !== undefined && { frequency_penalty: parameters.frequency_penalty.toString() }),
        ...(parameters?.presence_penalty !== undefined && { presence_penalty: parameters.presence_penalty.toString() })
      });

      const eventSource = new EventSource(
        `${api.defaults.baseURL}/api/llama/stream?${queryParams.toString()}`
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
          } catch (error) {
            console.log('Error parsing event data:', error);
            console.log('Raw event data:', event.data);
            if (!event.data.includes('"Type":"step"')) {
              finalContent += event.data;
            }
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          if (finalContent) {
            resolve({
              content: finalContent.trim(),
              type: 'text',
              metadata: {
                model: modelId,
                parameters: parameters // Include the parameters in metadata
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
              parameters: parameters // Include the parameters in metadata
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
      const errorMessage = err.response?.data?.error ?? 'Failed to execute operation.';
      throw new Error(`${errorMessage} Raw response: ${err.response?.data?.rawResponse ?? 'N/A'}`);
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    // Filter models from AI_MODELS that are from the 'llama' provider
    const seenIds = new Set<string>();
    return AI_MODELS
      .filter(model => {
        // Only include models that:
        // 1. Are from llama provider
        // 2. Are chat/function/embedding models (not agent)
        // 3. Haven't been seen before (avoid duplicates)
        if (model.provider === 'llama' && 
            (model.category === 'chat' || model.category === 'function' || model.category === 'embedding') &&
            !seenIds.has(model.id)) {
          seenIds.add(model.id);
          return true;
        }
        return false;
      })
      .map(model => ({
        ...model,
        isConfigured: this.isConfigured()
      }));
  }
} 