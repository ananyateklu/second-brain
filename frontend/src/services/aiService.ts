import { OpenAIService } from './ai/openai';
import { AnthropicService } from './ai/anthropic';
import { GeminiService } from './ai/gemini';
import { LlamaService } from './ai/llama';
import { GrokService } from './ai/grok';
import { AIModel, AIResponse, GrokFunction } from '../types/ai';

interface ModelOptions {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export class AIService {
  private readonly openai: OpenAIService;
  private readonly anthropic: AnthropicService;
  private readonly gemini: GeminiService;
  public readonly llama: LlamaService;
  public readonly grokService: GrokService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.gemini = new GeminiService();
    this.llama = new LlamaService();
    this.grokService = new GrokService();
  }

  async sendMessage(message: string, modelId: string, options?: ModelOptions): Promise<AIResponse> {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    switch (model.provider) {
      case 'openai':
        return this.openai.sendMessage(message, modelId, options);
      case 'anthropic':
        return this.anthropic.sendMessage(message, modelId, options);
      case 'gemini':
        return this.gemini.sendMessage(message, modelId, options);
      case 'llama':
        return this.llama.sendMessage(message, modelId, options);
      case 'grok':
        return this.grokService.sendMessage(message, modelId, options);
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

  getAvailableModels(): AIModel[] {
    return [
      ...this.openai.getModels(),
      ...this.anthropic.getModels(),
      ...this.gemini.getModels(),
      ...this.llama.getModels(),
      ...this.grokService.getModels(),
    ];
  }

  isOpenAIConfigured(): Promise<boolean> {
    return this.openai.isConfigured();
  }

  isAnthropicConfigured(): Promise<boolean> {
    return this.anthropic.isConfigured();
  }

  isGeminiConfigured(): boolean {
    return this.gemini.isConfigured();
  }

  isLlamaConfigured(): boolean {
    return this.llama.isConfigured();
  }

  async isGrokConfigured(): Promise<boolean> {
    return this.grokService.checkConfiguration();
  }

  async executeFunctionCall(
    message: string, 
    modelId: string, 
    functions: GrokFunction[]
  ): Promise<AIResponse> {
    if (modelId.startsWith('grok-')) {
      return this.grokService.executeFunctionCall(message, modelId, functions);
    }
    throw new Error('Function calling is only supported for Grok models');
  }
}