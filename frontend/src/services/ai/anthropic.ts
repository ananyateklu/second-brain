import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';

export class AnthropicService {
  private isEnabled = false;

  async testConnection(): Promise<boolean> {
    // TODO: Replace with actual backend call when ready
    return Promise.resolve(true);
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    // TODO: Replace with actual backend call when ready
    this.isEnabled = true;
    return Promise.resolve(true);
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    // TODO: Replace with actual backend call when ready
    return Promise.resolve({
      content: `Mock response from ${modelId}: ${message}`,
      type: 'text',
      metadata: {
        model: modelId,
        usage: {
          input_tokens: message.length,
          output_tokens: 50,
        },
      },
    });
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'anthropic');
  }
}