import { OpenAIService } from './ai/openai';
import { AnthropicService } from './ai/anthropic';
import { GeminiService } from './ai/gemini';
import { OllamaService } from './ai/ollama';
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
  public readonly ollama: OllamaService;
  public readonly grokService: GrokService;
  private _agentService: AgentService | null = null;
  private cachedModels: AIModel[] | null = null;
  private modelsLastFetched: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.gemini = new GeminiService();
    this.ollama = new OllamaService();
    this.grokService = new GrokService();
  }

  // Lazy initialization for agentService to avoid circular dependency
  private get agentService(): AgentService {
    if (!this._agentService) {
      this._agentService = new AgentService();
    }
    return this._agentService;
  }

  async sendMessage(
    message: string,
    modelId: string,
    options?: ModelOptions & {
      onStreamUpdate?: (
        content: string,
        stats?: {
          tokenCount: number,
          tokensPerSecond: string,
          elapsedSeconds: number
        }
      ) => void
    }
  ): Promise<AIResponse> {
    // Get models asynchronously
    const models = await this.getAvailableModels();
    const model = models.find(m => m.id === modelId);

    if (!model) {
      throw new Error('Invalid model selected');
    }

    // Handle special categories first
    if (model.category === 'agent') {
      return this.agentService.sendMessage(message, modelId, undefined, options);
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
      case 'ollama':
        return this.ollama.sendMessage(message, modelId, options);
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

  async getAvailableModels(): Promise<AIModel[]> {
    // Check if we have cached models that are still valid
    const now = Date.now();
    if (this.cachedModels && (now - this.modelsLastFetched < this.CACHE_DURATION)) {
      return this.cachedModels;
    }

    try {
      // First get all agent models
      const agentModels = this.agentService.getAvailableModels();
      const agentModelIds = new Set(agentModels.map((m: AIModel) => m.id));

      // Fetch models from providers that are configured
      const models: AIModel[] = [];

      // Add agent models
      models.push(...agentModels);

      // Add OpenAI models
      const openAIModels = await this.openai.getModels();
      models.push(...openAIModels.filter((m: AIModel) => !agentModelIds.has(m.id) && m.category !== 'agent'));

      // Add Anthropic models
      const anthropicModels = await this.anthropic.getModels();
      models.push(...anthropicModels.filter((m: AIModel) => !agentModelIds.has(m.id) && m.category !== 'agent'));

      // Add Gemini models dynamically fetched from backend
      try {
        const geminiModels = await this.gemini.getModels();
        models.push(...geminiModels.filter((m: AIModel) => !agentModelIds.has(m.id) && m.category !== 'agent'));
      } catch (geminiError) {
        console.error('Error fetching Gemini models in AIService:', geminiError);
      }

      // Add Grok models dynamically fetched from the backend
      try {
        const grokModels = await this.grokService.getModels();
        models.push(...grokModels.filter((m: AIModel) => !agentModelIds.has(m.id) && m.category !== 'agent'));
      } catch (grokError) {
        console.error('Error fetching Grok models in AIService:', grokError);
      }

      // Fetch Ollama models only if configured
      let ollamaModels: AIModel[] = [];
      if (this.ollama.isConfigured()) {
        try {
          ollamaModels = await this.ollama.getModels();
          // Only add Ollama models if they were successfully fetched
          models.push(...ollamaModels.filter((m: AIModel) => !agentModelIds.has(m.id) && m.category !== 'agent'));
        } catch (error) {
          console.error('Error fetching Ollama models, skipping:', error);
          // Don't add Ollama models if there was an error
        }
      }

      // Cache the result
      this.cachedModels = models;
      this.modelsLastFetched = now;

      return models;
    } catch (error) {
      console.error('Error fetching available models:', error);
      // If we have cached models, return them even if they're expired
      if (this.cachedModels) {
        return this.cachedModels;
      }
      // Otherwise throw the error
      throw error;
    }
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

  isOllamaConfigured(): boolean {
    return this.ollama.isConfigured();
  }

  async isGrokConfigured(): Promise<boolean> {
    return this.grokService.checkConfiguration();
  }

  async isAgentConfigured(): Promise<boolean> {
    return this.agentService.testConnection();
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