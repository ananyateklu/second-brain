import { OpenAIService } from './ai/openai';
import { AnthropicService } from './ai/anthropic';
import { GeminiService } from './ai/gemini';
import { AIModel, AIResponse } from '../types/ai';

export class AIService {
  private readonly openai: OpenAIService;
  private readonly anthropic: AnthropicService;
  private readonly gemini: GeminiService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.gemini = new GeminiService();
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
      case 'gemini':
        return this.gemini.sendMessage(message, modelId);
      default:
        throw new Error('Unsupported AI provider');
    }
  }

  async transcribeAudio(file: File): Promise<AIResponse> {
    return this.openai.transcribeAudio(file);
  }

  async textToSpeech(text: string): Promise<AIResponse> {
    return this.openai.textToSpeech(text);
  }

  async setOpenAIKey(apiKey: string): Promise<boolean> {
    return this.openai.setApiKey(apiKey);
  }

  async setAnthropicKey(apiKey: string): Promise<boolean> {
    return this.anthropic.setApiKey(apiKey);
  }

  async setGeminiKey(apiKey: string): Promise<boolean> {
    return this.gemini.setApiKey(apiKey);
  }

  getAvailableModels(): AIModel[] {
    return [
      ...this.openai.getModels(),
      ...this.anthropic.getModels(),
      ...this.gemini.getModels(),
    ];
  }

  isOpenAIConfigured(): boolean {
    return this.openai.isConfigured();
  }

  isAnthropicConfigured(): boolean {
    return this.anthropic.isConfigured();
  }

  isGeminiConfigured(): boolean {
    return this.gemini.isConfigured();
  }
}