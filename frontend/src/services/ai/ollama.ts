import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AI_MODELS } from './models';

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
      let finalContent = '';

      // Use POST for large prompts to avoid URI length limitations
      const eventSource = new PostEventSource(
        `${api.defaults.baseURL}/api/ollama/stream`,
        {
          prompt: message,
          modelId: modelId,
          maxTokens: parameters?.max_tokens,
          temperature: parameters?.temperature,
          topP: parameters?.top_p,
          frequencyPenalty: parameters?.frequency_penalty,
          presencePenalty: parameters?.presence_penalty
        }
      );

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.Type === 'content') {
              finalContent += data.Content;
            } else if (data.Type === 'step' && data.Content && !data.Content.includes('Processing request')) {
              if (!data.Metadata?.type?.includes('processing') &&
                !data.Metadata?.type?.includes('thinking') &&
                !data.Metadata?.type?.includes('function_call') &&
                !data.Metadata?.type?.includes('database_operation')) {
                finalContent += data.Content;
              }
            }
          } catch {
            if (!event.data.includes('"Type":"step"')) {
              finalContent += event.data;
            }
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          if (finalContent) {
            resolve({
              content: finalContent.trim(),
              type: 'text',
              metadata: {
                model: modelId,
                parameters: parameters
              }
            });
          } else {
            reject(new Error('Stream ended without content'));
          }
        };

        eventSource.addEventListener('complete', () => {
          eventSource.close();
          resolve({
            content: finalContent.trim(),
            type: 'text',
            metadata: {
              model: modelId,
              parameters: parameters
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

  getModels(): AIModel[] {
    // Filter models from AI_MODELS that are from the 'ollama' provider
    const seenIds = new Set<string>();
    return AI_MODELS
      .filter(model => {
        // Only include models that:
        // 1. Are from ollama provider
        // 2. Are chat/function/embedding models (not agent)
        // 3. Haven't been seen before (avoid duplicates)
        if (model.provider === 'ollama' &&
          (model.category === 'chat' || model.category === 'function' || model.category === 'embedding') &&
          !seenIds.has(model.id)) {
          seenIds.add(model.id);
          return true;
        }
        return false;
      })
      .map(model => ({
        ...model,
        isConfigured: this.isConfigured()
      }));
  }
} 