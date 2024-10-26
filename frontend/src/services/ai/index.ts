import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { AIModel, AIResponse } from '../../types/ai';

export class AIService {
  private openai: OpenAIService;
  private anthropic: AnthropicService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    switch (model.provider) {
      case 'openai':
        return this.openai.sendMessage(message, modelId);
      case 'anthropic':
        return this.anthropic.sendMessage(message, modelId);
      default:
        throw new Error('Unsupported AI provider');
    }
  }

  async transcribeAudio(file: File): Promise<AIResponse> {
    return this.openai.transcribeAudio(file);
  }

  async setOpenAIKey(apiKey: string): Promise<boolean> {
    return this.openai.setApiKey(apiKey);
  }

  async setAnthropicKey(apiKey: string): Promise<boolean> {
    return this.anthropic.setApiKey(apiKey);
  }

  getAvailableModels(): AIModel[] {
    return [
      ...this.openai.getModels(),
      ...this.anthropic.getModels()
    ];
  }

  isOpenAIConfigured(): boolean {
    return this.openai.isConfigured();
  }

  isAnthropicConfigured(): boolean {
    return this.anthropic.isConfigured();
  }
}