import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import { LlamaService } from './llama';
export class AIService {
  private openai: OpenAIService;
  private anthropic: AnthropicService;
  private geminiService: GeminiService;
  private llamaService: LlamaService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.geminiService = new GeminiService();
    this.llamaService = new LlamaService();
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    if (modelId.startsWith('models/gemini-')) {
      return this.geminiService.sendMessage(message, modelId);
    }

    const model = this.getAvailableModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    switch (model.provider) {
      case 'openai':
        return this.openai.sendMessage(message, modelId);
      case 'anthropic':
        return this.anthropic.sendMessage(message, modelId);
      case 'llama':
        return this.llamaService.sendMessage(message, modelId);
      case 'gemini':
        return this.geminiService.sendMessage(message, modelId);
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
    return AI_MODELS.filter(model => model.provider === 'openai' || model.provider === 'anthropic' || model.provider === 'llama' || model.provider === 'gemini');
  }

  isOpenAIConfigured(): boolean {
    return this.openai.isConfigured();
  }

  async isAnthropicConfigured(): Promise<boolean> {
    try {
      return await this.anthropic.testConnection();
    } catch (error) {
      console.error('Error checking Anthropic configuration:', error);
      return false;
    }
  }
}