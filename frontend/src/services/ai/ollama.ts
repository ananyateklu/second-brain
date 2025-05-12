import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { OllamaModelsResponse } from '../../types/ollama';

// EventSource polyfill with POST support
class PostEventSource {
  private eventSource: EventSource | null = null;
  private url: string;
  private data: object;
  private events: Record<string, ((event: MessageEvent) => void)[]> = {};

  constructor(url: string, data: object) {
    this.url = url;
    this.data = data;
    this.connect();
  }

  private async connect() {
    try {
      // Make a POST request to the server
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(this.data),
      });

      // Create a new reader from the response body
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader from response');

      // Process the stream
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        const { done, value } = await reader.read();
        if (done) return;

        // Append the new data to our buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse the event data
          const eventLines = line.split('\n');
          let eventName = 'message';
          let data = '';

          for (const eventLine of eventLines) {
            if (eventLine.startsWith('event:')) {
              eventName = eventLine.slice(6).trim();
            } else if (eventLine.startsWith('data:')) {
              data = eventLine.slice(5).trim();
            }
          }

          // Dispatch the event
          const eventHandlers = this.events[eventName] || [];
          for (const handler of eventHandlers) {
            handler(new MessageEvent(eventName, { data }));
          }

          // Also dispatch to onmessage if it's a message event
          if (eventName === 'message' && this.onmessage) {
            this.onmessage(new MessageEvent('message', { data }));
          }
        }

        // Continue reading
        processStream();
      };

      processStream();
    } catch (error) {
      console.error('PostEventSource error:', error);
      if (this.onerror) this.onerror(new Event('error'));
    }
  }

  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  removeEventListener(event: string, callback: (event: MessageEvent) => void) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  close() {
    this.eventSource?.close();
    this.events = {};
  }

  // Standard EventSource properties
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

export class OllamaService {
  private readonly isEnabled = true;
  private cachedModels: AIModel[] | null = null;
  private modelsLastFetched: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async sendMessage(
    message: string,
    modelId: string,
    parameters?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      onStreamUpdate?: (
        data: string,
        stats?: {
          tokenCount: number,
          tokensPerSecond: string,
          elapsedSeconds: number
        }
      ) => void;
    }
  ): Promise<AIResponse> {
    try {
      let finalContent = '';
      // Track token count and timing for statistics
      let tokenCount = 0;
      const startTime = Date.now();
      const tokenTimestamps: number[] = [];

      // Use POST for large prompts to avoid URI length limitations
      const eventSource = new PostEventSource(
        `${api.defaults.baseURL}/api/ollama/stream`,
        {
          prompt: message,
          modelId: modelId,
          numPredict: parameters?.max_tokens || 2048,
          temperature: parameters?.temperature,
          topP: parameters?.top_p,
          frequencyPenalty: parameters?.frequency_penalty,
          presencePenalty: parameters?.presence_penalty
        }
      );

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            console.log('Received event data:', event.data);
            const data = JSON.parse(event.data);

            if (data.Type === 'content') {
              finalContent += data.Content;
              // Track each token and timestamp
              tokenCount += 1;
              tokenTimestamps.push(Date.now());

              console.log('Adding content token:', data.Content, 'Final so far:', finalContent);

              // Calculate current tokens per second for real-time display
              const currentTime = Date.now();
              const elapsedSeconds = (currentTime - startTime) / 1000;
              const currentTokensPerSecond = tokenCount / Math.max(0.1, elapsedSeconds);

              // Notify any consumers about the real-time token updates with stats
              if (parameters?.onStreamUpdate) {
                parameters.onStreamUpdate(finalContent, {
                  tokenCount,
                  tokensPerSecond: currentTokensPerSecond.toFixed(2),
                  elapsedSeconds
                });
              }
            } else if (data.Type === 'step' && data.Content && !data.Content.includes('Processing request')) {
              if (!data.Metadata?.type?.includes('processing') &&
                !data.Metadata?.type?.includes('thinking') &&
                !data.Metadata?.type?.includes('function_call') &&
                !data.Metadata?.type?.includes('database_operation')) {
                finalContent += data.Content;
                console.log('Adding step content:', data.Content);
                // Calculate current tokens per second
                const currentTime = Date.now();
                const elapsedSeconds = (currentTime - startTime) / 1000;
                const currentTokensPerSecond = tokenCount / Math.max(0.1, elapsedSeconds);

                // Notify any consumers about the real-time token updates with stats
                if (parameters?.onStreamUpdate && finalContent.trim()) {
                  parameters.onStreamUpdate(finalContent, {
                    tokenCount,
                    tokensPerSecond: currentTokensPerSecond.toFixed(2),
                    elapsedSeconds
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error parsing event data:', event.data, error);
            if (!event.data.includes('"Type":"step"')) {
              finalContent += event.data;
              tokenCount += 1; // Count error data as a token too

              // Calculate stats even for error data
              const currentTime = Date.now();
              const elapsedSeconds = (currentTime - startTime) / 1000;
              const currentTokensPerSecond = tokenCount / Math.max(0.1, elapsedSeconds);

              // Notify any consumers about the real-time token updates with stats
              if (parameters?.onStreamUpdate) {
                parameters.onStreamUpdate(finalContent, {
                  tokenCount,
                  tokensPerSecond: currentTokensPerSecond.toFixed(2),
                  elapsedSeconds
                });
              }
            }
          }
        };

        eventSource.onerror = (event) => {
          console.error('Ollama stream error:', event);
          eventSource.close();
          if (finalContent) {
            // Even on error, if we have some content, return it with stats
            const endTime = Date.now();
            const totalTimeSeconds = (endTime - startTime) / 1000;
            const tokensPerSecond = tokenCount / totalTimeSeconds;

            resolve({
              content: finalContent.trim(),
              type: 'text',
              metadata: {
                model: modelId,
                parameters: parameters,
                stats: {
                  tokenCount,
                  totalTimeSeconds,
                  tokensPerSecond: tokensPerSecond.toFixed(2),
                  startTime,
                  endTime
                }
              }
            });
          } else {
            reject(new Error('Stream ended without content'));
          }
        };

        eventSource.addEventListener('complete', () => {
          eventSource.close();

          // Calculate token generation stats
          const endTime = Date.now();
          const totalTimeSeconds = (endTime - startTime) / 1000;
          const tokensPerSecond = tokenCount / totalTimeSeconds;

          resolve({
            content: finalContent.trim(),
            type: 'text',
            metadata: {
              model: modelId,
              parameters: parameters,
              stats: {
                tokenCount,
                totalTimeSeconds,
                tokensPerSecond: tokensPerSecond.toFixed(2),
                startTime,
                endTime
              }
            }
          });
        });
      });

    } catch (error) {
      console.error('[OllamaService] Error:', error);
      throw new Error('Failed to get response from Ollama model');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  async fetchModelsFromAPI(): Promise<AIModel[]> {
    try {
      const response = await api.get<OllamaModelsResponse>('/api/ollama/models');
      const ollamaModels = response.data.models;

      // Convert Ollama API models to AIModel format
      const models: AIModel[] = ollamaModels.map(model => {
        // Extract name and categorize model
        const name = model.name;
        const paramSize = model.details.parameter_size || '';

        // Determine model category and other properties
        let category: 'chat' | 'function' | 'embedding' | 'agent' = 'chat';
        const isReasoner = name.toLowerCase().includes('marco') ||
          name.toLowerCase().includes('qwq');

        if (name.toLowerCase().includes('embed')) {
          category = 'embedding';
        }

        const modelColorMap: Record<string, string> = {
          'mistral': '#5E81AC',
          'llama': '#8B5CF6',
          'gemma': '#10B981',
          'phi': '#F59E0B',
          'qwen': '#EC4899',
          'mpt': '#6366F1',
          'openchat': '#059669',
          'yi': '#F97316',
          'wizardlm': '#14B8A6',
          'falcon': '#7F1D1D',
        };

        // Get color based on model family
        let color = '#8B5CF6'; // Default color
        Object.entries(modelColorMap).forEach(([family, familyColor]) => {
          if (name.toLowerCase().includes(family)) {
            color = familyColor;
          }
        });

        const formattedName = this.formatModelName(name);

        return {
          id: name,
          name: formattedName,
          provider: 'ollama',
          category,
          description: `${formattedName}${paramSize ? ` (${paramSize})` : ''} - Local Ollama model`,
          isConfigured: true,
          isReasoner,
          color,
          endpoint: 'chat',
          size: paramSize,
          rateLimits: {
            tpm: 60000,
            rpm: 35,
            maxInputTokens: 16384,
            maxOutputTokens: 4096,
          },
        };
      });

      // Return the converted models
      return models;
    } catch (error) {
      console.error('Error fetching Ollama models from API:', error);
      throw error;
    }
  }

  private formatModelName(name: string): string {
    // Remove any ':latest' suffix
    name = name.replace(':latest', '');

    // Split on special characters
    const parts = name.split(/[:._ -]/);

    // Capitalize each part
    return parts.map(part => {
      // Keep version numbers as is
      if (/^\d+(\.\d+)?[a-z]?$/.test(part)) {
        return part;
      }
      // Capitalize first letter of each word
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  async getModels(): Promise<AIModel[]> {
    // Check if cached models are still valid
    const now = Date.now();
    if (this.cachedModels && (now - this.modelsLastFetched < this.CACHE_DURATION)) {
      return this.cachedModels;
    }

    try {
      // Try to fetch models from API
      const models = await this.fetchModelsFromAPI();

      // Cache models
      this.cachedModels = models;
      this.modelsLastFetched = now;

      return models;
    } catch (error) {
      console.error('Failed to fetch Ollama models from API:', error);

      // No longer falling back to static models
      // Instead, throw the error to indicate an issue with the Ollama endpoint
      throw error;
    }
  }
} 