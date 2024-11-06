import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import { LlamaService } from './llama';
import { GrokService } from './grok';

export class AIService {
  private openai: OpenAIService;
  private anthropic: AnthropicService;
  private geminiService: GeminiService;
  private llamaService: LlamaService;
  private grokService: GrokService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.geminiService = new GeminiService();
    this.llamaService = new LlamaService();
    this.grokService = new GrokService();
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    if (modelId.startsWith('grok-')) {
      return this.grokService.sendMessage(message, modelId);
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
    return this.geminiService.setApiKey(apiKey);
  }

  getAvailableModels(): AIModel[] {
    return [
      ...this.openai.getModels(),
      ...this.anthropic.getModels(),
      ...this.geminiService.getModels(),
      ...this.llamaService.getModels(),
      ...this.grokService.getModels(),
    ];
  }

  isOpenAIConfigured(): boolean {
    return this.openai.isConfigured();
  }

  isAnthropicConfigured(): boolean {
    return this.anthropic.isConfigured();
  }

  isGeminiConfigured(): boolean {
    return this.geminiService.isConfigured();
  }

  isLlamaConfigured(): boolean {
    return this.llamaService.isConfigured();
  }

  isGrokConfigured(): boolean {
    return this.grokService.isConfigured();
  }

  async executeFunctionCall(message: string, modelId: string, functions: any[]): Promise<AIResponse> {
    if (modelId.startsWith('grok-')) {
      return this.grokService.executeFunctionCall(message, modelId, functions);
    }
    throw new Error('Function calling is only supported for Grok models');
  }
}