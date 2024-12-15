import { OpenAIService } from './ai/openai';
import { AnthropicService } from './ai/anthropic';
import { GeminiService } from './ai/gemini';
import { LlamaService } from './ai/llama';
import { GrokService } from './ai/grok';
import { AgentService } from './ai/agent';
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
  private readonly agentService: AgentService;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.gemini = new GeminiService();
    this.llama = new LlamaService();
    this.grokService = new GrokService();
    this.agentService = new AgentService();
  }

  async sendMessage(message: string, modelId: string, options?: ModelOptions): Promise<AIResponse> {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    // Handle special categories first
    if (model.category === 'agent') {
      return this.agentService.sendMessage(message, modelId, options);
    }
    if (model.category === 'function' && model.provider === 'grok') {
      return this.grokService.executeFunctionCall(message, modelId, []);
    }
    if (model.category === 'rag') {
      throw new Error('RAG models not implemented yet');
    }

    // Handle regular provider-specific routing
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
    // First get all agent models
    const agentModels = this.agentService.getModels();
    const agentModelIds = new Set(agentModels.map(m => m.id));

    // Then get all other models, excluding those that are already in agent models
    const otherModels = [
      ...this.openai.getModels().filter(m => !agentModelIds.has(m.id) && m.category !== 'agent'),
      ...this.anthropic.getModels().filter(m => !agentModelIds.has(m.id) && m.category !== 'agent'),
      ...this.gemini.getModels().filter(m => !agentModelIds.has(m.id) && m.category !== 'agent'),
      ...this.llama.getModels().filter(m => !agentModelIds.has(m.id) && m.category !== 'agent'),
      ...this.grokService.getModels().filter(m => !agentModelIds.has(m.id) && m.category !== 'agent')
    ];

    return [...agentModels, ...otherModels];
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

  async isAgentConfigured(): Promise<boolean> {
    return this.agentService.isConfigured();
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