import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';

export class OpenAIService {
  private isEnabled = false;

  constructor() {
    // Remove this as it won't complete before isConfigured is called
    // this.checkConfiguration();
  }

  async isConfigured(): Promise<boolean> {
    try {
      const response = await api.get('/api/ai/openai/status');
      this.isEnabled = response.data.isConfigured;
      return this.isEnabled;
    } catch (error) {
      console.error('Error checking OpenAI configuration:', error);
      this.isEnabled = false;
      return false;
    }
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const model = this.getModels().find(m => m.id === modelId);
      if (!model) {
        throw new Error('Invalid model selected');
      }

      switch (model.endpoint) {
        case 'chat': {
          const response = await api.post('/api/ai/openai/chat', {
            model: modelId,
            messages: [{ role: 'user', content: message }]
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
            content: response.data.data[0].embedding,
            type: 'embedding',
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

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'openai');
  }
}