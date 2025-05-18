import { AIModel, AIResponse } from '../../types/ai';
// import { AI_MODELS } from './models'; // This will be replaced
import api from '../api/api';

// Define a type for the backend's OpenAIModelInfo for type safety
interface BackendOpenAIModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  // Potentially other fields if the actual API returns more than the example
}

interface BackendOpenAIModelsResponse {
  object: string;
  data: BackendOpenAIModelInfo[];
}

export class OpenAIService {
  private isEnabled = false;
  private fetchedModels: AIModel[] | null = null; // Cache for fetched models

  async isConfigured(): Promise<boolean> {
    try {
      const response = await api.get('/api/ai/openai/status');
      this.isEnabled = response.data.isConfigured;
      // If configured, try to fetch models to confirm full operational status
      if (this.isEnabled) {
        const models = await this.getModels();
        this.isEnabled = models.length > 0;
      }
      return this.isEnabled;
    } catch (error) {
      console.error('Error checking OpenAI configuration:', error);
      this.isEnabled = false;
      return false;
    }
  }

  private async fetchModelsFromAPI(): Promise<AIModel[]> {
    try {
      const response = await api.get<BackendOpenAIModelsResponse>('/api/ai/openai/models');
      if (response.data && response.data.data) {
        return response.data.data.map(modelInfo => {
          // Basic mapping, can be enriched further if needed
          let category: AIModel['category'] = 'chat'; // Default to chat
          let endpoint: AIModel['endpoint'] = 'chat';
          let description = `OpenAI model: ${modelInfo.id}`;

          // Infer category/endpoint from model ID patterns (example)
          if (modelInfo.id.includes('text-embedding')) {
            category = 'embedding';
            endpoint = 'embeddings';
            description = `OpenAI embedding model: ${modelInfo.id}`;
          } else if (modelInfo.id.startsWith('dall-e')) {
            category = 'image';
            endpoint = 'images';
            description = `OpenAI image generation model: ${modelInfo.id}`;
          } else if (modelInfo.id.startsWith('whisper') || modelInfo.id.startsWith('tts')) {
            category = 'audio';
            endpoint = 'audio';
            description = `OpenAI audio model: ${modelInfo.id}`;
          } else if (modelInfo.id.includes('-agent') || modelInfo.id.startsWith('o1') || modelInfo.id.startsWith('o3') || modelInfo.id.startsWith('o4')) {
            category = 'agent'; // Or 'reasoning' based on your types
            endpoint = 'agent'; // Or 'chat' if agents use chat endpoint
            description = `OpenAI agent/reasoning model: ${modelInfo.id}`;
          }

          return {
            id: modelInfo.id,
            name: modelInfo.id, // OpenAI API for /v1/models doesn't give a separate display name
            provider: 'openai',
            category,
            description,
            isConfigured: true, // If fetched, assume it can be used
            isReasoner: modelInfo.id.startsWith('o1') || modelInfo.id.startsWith('o3') || modelInfo.id.startsWith('o4'), // Example heuristic
            color: '#3B7443', // Default OpenAI color
            endpoint,
            // RateLimits and size are harder to get from this generic endpoint
            // These would typically come from more detailed model info or be hardcoded per model type
            rateLimits: {},
            size: '',
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Error fetching OpenAI models from backend:', error);
      return [];
    }
  }

  async getModels(): Promise<AIModel[]> {
    if (this.fetchedModels) {
      return this.fetchedModels;
    }
    const apiModels = await this.fetchModelsFromAPI();
    if (apiModels.length > 0) {
      this.fetchedModels = apiModels;
      return apiModels;
    }
    // Fallback to static models if API fetch fails or returns no models
    console.warn("Falling back to static OpenAI models as API fetch failed or returned no models.");
    const staticModels = (await import('./openaiModels')).OPENAI_MODELS;
    this.fetchedModels = staticModels;
    return staticModels;
  }

  async sendMessage(
    message: string,
    modelId: string,
    parameters?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    }
  ): Promise<AIResponse> {
    try {
      const models = await this.getModels();
      const model = models.find(m => m.id === modelId);
      if (!model) {
        throw new Error('Invalid model selected: ' + modelId);
      }

      switch (model.endpoint) {
        case 'chat': {
          const response = await api.post('/api/ai/openai/chat', {
            model: modelId,
            messages: [{ role: 'user', content: message }],
            ...parameters
          });
          return {
            content: response.data.choices[0].message.content,
            type: 'text'
          };
        }

        case 'embeddings': {
          const response = await api.post('/api/ai/openai/embeddings', {
            model: modelId,
            input: message,
            encoding_format: 'float'
          });
          return {
            content: JSON.stringify(response.data.data[0].embedding),
            type: 'text',
            metadata: {
              model: modelId,
              usage: response.data.usage
            }
          };
        }

        case 'audio': {
          const response = await api.post('/api/ai/openai/audio/speech', {
            input: message,
            model: modelId,
            voice: 'alloy'
          }, {
            responseType: 'blob'
          });

          const audioUrl = URL.createObjectURL(response.data);
          return {
            content: audioUrl,
            type: 'audio',
            inputText: message
          };
        }

        case 'images': {
          const response = await api.post('/api/ai/openai/images/generate', {
            model: modelId,
            prompt: message,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
          }, {
            timeout: 60000 // Increase to 60 seconds
          });

          // Wait for image to load before returning
          if (response.data?.data?.[0]?.url) {
            // Pre-load the image
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = reject;
              img.src = response.data.data[0].url;
            });

            return {
              content: response.data.data[0].url,
              type: 'image',
              metadata: {
                model: modelId,
                prompt: message,
                revised_prompt: response.data.data[0].revised_prompt
              }
            };
          }

          throw new Error('Invalid image generation response');
        }

        default:
          throw new Error('Unsupported endpoint type: ' + model.endpoint);
      }
    } catch (error) {
      console.error('Error in OpenAI service:', error);
      throw error;
    }
  }

  async transcribeAudio(file: File): Promise<AIResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/ai/openai/audio/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        content: response.data.text,
        type: 'text'
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async textToSpeech(text: string): Promise<AIResponse> {
    try {
      const response = await api.post('/api/ai/openai/audio/speech',
        { text, model: 'tts-1' },
        { responseType: 'blob' }
      );

      const audioUrl = URL.createObjectURL(response.data);
      return {
        content: audioUrl,
        type: 'audio'
      };
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw error;
    }
  }
}