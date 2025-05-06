import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AI_MODELS } from './models';

export class OllamaService {
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
      let finalContent = '';

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
        `${api.defaults.baseURL}/api/ollama/stream?${queryParams.toString()}`
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
          } catch {
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
      console.error('[OllamaService] Error:', error);
      throw new Error('Failed to get response from Ollama model');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    // Filter models from AI_MODELS that are from the 'ollama' provider
    const seenIds = new Set<string>();
    return AI_MODELS
      .filter(model => {
        // Only include models that:
        // 1. Are from ollama provider
        // 2. Are chat/function/embedding models (not agent)
        // 3. Haven't been seen before (avoid duplicates)
        if (model.provider === 'ollama' &&
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