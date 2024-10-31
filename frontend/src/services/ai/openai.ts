import OpenAI from 'openai';
import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';

export class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (apiKey) {
      this.initialize(apiKey);
    }
  }

  private initialize(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true
    });
  }

  private validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.trim().startsWith('sk-') && apiKey.length > 20;
  }

  private cleanResponse(text: string): string {
    // First, remove any markdown backticks or code blocks
    text = text.replace(/```[^`]*```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');

    // Remove any response prefixes
    text = text.replace(/^(Title:|Suggested Title:|Generated Title:|Response:|Here's a title:|How about:|I suggest:|Try this:|Result:)/i, '');

    // Remove all types of quotes and apostrophes
    text = text.replace(/["''""`]/g, '');

    // Clean up whitespace
    text = text.trim();
    text = text.replace(/\s+/g, ' ');

    return text;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1
      });

      return Boolean(response?.choices?.[0]?.message?.content);
    } catch (error: any) {
      this.handleError(error);
      return false;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }

    try {
      this.initialize(apiKey);
      const isValid = await this.testConnection();
      if (isValid) {
        localStorage.setItem('openai_api_key', apiKey.trim());
        return true;
      }
      this.client = null;
      localStorage.removeItem('openai_api_key');
      return false;
    } catch (error) {
      this.client = null;
      localStorage.removeItem('openai_api_key');
      throw error;
    }
  }

  async sendMessage(
    message: string,
    modelId: string,
    onUpdate?: (newContent: string) => void
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const model = this.getModels().find((m) => m.id === modelId);
    if (!model) {
      throw new Error('Invalid model selected');
    }

    try {
      switch (model.endpoint) {
        case 'chat': {
          let fullContent = '';
          const response = await this.client.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: message }],
            temperature: 0.7,
            max_tokens: 1000,
            stream: Boolean(onUpdate), // Only stream if onUpdate is provided
          });

          if (response.choices) {
            // Handle non-streaming response
            return {
              content: response.choices[0]?.message?.content || '',
              type: 'text'
            };
          } else {
            // Handle streaming response
            for await (const part of response as any) {
              const content = part.choices[0]?.delta?.content || '';
              fullContent += content;
              onUpdate?.(content);
            }
            return {
              content: fullContent,
              type: 'text'
            };
          }
        }

        case 'embeddings': {
          const response = await this.client.embeddings.create({
            model: modelId,
            input: message,
            encoding_format: 'float'
          });
          return {
            content: response.data[0].embedding,
            type: 'embedding'
          };
        }

        case 'images': {
          const response = await this.client.images.generate({
            model: modelId,
            prompt: message,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural",
          });

          return {
            content: response.data[0].url || '',
            type: 'image'
          };
        }

        case 'audio': {
          if (modelId === 'tts-1') {
            const response = await this.client.audio.speech.create({
              model: modelId,
              input: message,
              voice: 'alloy'
            });
            
            const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            return {
              content: audioUrl,
              type: 'audio'
            };
          }
          throw new Error('Unsupported audio model');
        }

        default:
          throw new Error('Unsupported endpoint type: ' + model.endpoint);
      }
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  async transcribeAudio(audioFile: File): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile,
        language: 'en'
      });

      return {
        content: response.text,
        type: 'text',
        metadata: {
          model: 'whisper-1',
          language: 'en'
        }
      };
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  async textToSpeech(text: string): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        input: text,
        voice: 'alloy'
      });

      const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        content: audioUrl,
        type: 'audio'
      };
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any): never {
    console.error('OpenAI Error:', error);

    if (error?.status === 401) {
      throw new Error('Authentication failed. Please check your API key in settings.');
    }
    if (error?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error?.status === 404) {
      throw new Error('Model not found or not available. Please try a different model.');
    }
    if (error?.status === 500) {
      throw new Error('OpenAI service error. Please try again later.');
    }

    throw new Error(error?.message || 'An unexpected error occurred');
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'openai');
  }
}