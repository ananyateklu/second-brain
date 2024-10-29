import { AIModel, AIResponse } from '../../types/ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private apiKey: string | null = null;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (apiKey) {
      this.initialize(apiKey);
    }
  }

  private initialize(apiKey: string) {
    this.apiKey = apiKey.trim();
    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  private validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.trim().length > 0;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.client !== null;
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }

    try {
      this.initialize(apiKey);
      // Optionally test the connection here
      localStorage.setItem('gemini_api_key', apiKey.trim());
      return true;
    } catch (error) {
      this.apiKey = null;
      localStorage.removeItem('gemini_api_key');
      throw error;
    }
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Gemini not configured');
    }

    const model = this.getModels().find((m) => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    try {
      // Remove the 'models/' prefix when passing to the client
      const modelName = modelId.replace(/^models\//, '');
      const generativeModel = this.client.getGenerativeModel({ model: modelName });
      const result = await generativeModel.generateContent([message]);

      const content = result.response.text();

      return {
        content,
        type: 'text',
      };
    } catch (error: any) {
      this.handleError(error);
      throw new Error(`Failed to generate suggestion for model ${modelId}: ${error.message}`);
    }
  }

  private handleError(error: any): never {
    console.error('Gemini Error:', error);
    throw new Error(error?.message || 'An unexpected error occurred');
  }

  getModels(): AIModel[] {
    return [
      {
        id: 'models/gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        category: 'chat',
        description: 'Google Gemini 1.5 Flash model for chat and completion tasks.',
        isConfigured: this.isConfigured(),
        color: '#4285F4',
        endpoint: 'chat',
      },
      {
        id: 'models/gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        provider: 'gemini',
        category: 'chat',
        description: 'Google Gemini 1.5 Flash-8B model for high-volume tasks.',
        isConfigured: this.isConfigured(),
        color: '#4285F4',
        endpoint: 'chat',
      },
      {
        id: 'models/gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        category: 'chat',
        description: 'Google Gemini 1.5 Pro model for complex reasoning tasks.',
        isConfigured: this.isConfigured(),
        color: '#4285F4',
        endpoint: 'chat',
      },
      {
        id: 'models/gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'gemini',
        category: 'chat',
        description: 'Google Gemini 1.0 Pro model for text and code tasks.',
        isConfigured: this.isConfigured(),
        color: '#4285F4',
        endpoint: 'chat',
      },
      // Add other models as needed
    ];
  }
}
