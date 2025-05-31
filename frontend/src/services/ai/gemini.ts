import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';
import { AI_MODELS } from './models';

interface StreamChatRequest {
  message: string;
  modelId: string;
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    topK: number;
    stopSequences: string[];
  };
  safetySettings: unknown[];
}

export class GeminiService {
  isConfigured(): boolean {
    return true; // Configuration is handled by backend
  }

  async sendMessage(
    message: string,
    modelId: string,
    options?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      onStreamUpdate?: (content: string, stats?: { tokenCount: number, tokensPerSecond: string, elapsedSeconds: number }) => void;
    }
  ): Promise<AIResponse> {
    try {
      const request = {
        message,
        modelId,
        generationConfig: {
          maxOutputTokens: options?.max_tokens || 2048,
          temperature: options?.temperature || 0.7,
          topP: options?.top_p || 0.8,
          topK: 40,
          stopSequences: []
        },
        safetySettings: []
      };

      // Use streaming if onStreamUpdate callback is provided
      if (options?.onStreamUpdate) {
        return this.sendStreamingMessage(request, options.onStreamUpdate);
      }

      // Fallback to non-streaming for backward compatibility
      const response = await api.post('/api/gemini/chat', request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        content: response.data.content.content,
        type: 'text',
        metadata: {
          model: modelId,
          parameters: options // Include the parameters in metadata for debugging
        }
      };
    } catch (error: unknown) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async sendStreamingMessage(
    request: StreamChatRequest,
    onStreamUpdate: (content: string, stats?: { tokenCount: number, tokensPerSecond: string, elapsedSeconds: number }) => void
  ): Promise<AIResponse> {
    // Since EventSource doesn't support POST with body, we'll use fetch instead
    return this.streamWithFetch(request, onStreamUpdate);
  }

  private async streamWithFetch(
    request: StreamChatRequest,
    onStreamUpdate: (content: string, stats?: { tokenCount: number, tokensPerSecond: string, elapsedSeconds: number }) => void
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let accumulatedContent = '';
    let tokenCount = 0;

    try {
      // Get the authorization token - try multiple sources
      let authHeader = api.defaults.headers.common?.Authorization as string;

      // Fallback to getting token from localStorage if not in api headers
      if (!authHeader) {
        const token = localStorage.getItem('access_token');
        if (token) {
          authHeader = `Bearer ${token}`;
        }
      }

      if (!authHeader) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${api.defaults.baseURL}/api/gemini/stream-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                break;
              }

              try {
                const update = JSON.parse(data);
                if (update.Content) {
                  accumulatedContent += update.Content;
                  tokenCount++;

                  const elapsedSeconds = (Date.now() - startTime) / 1000;
                  const tokensPerSecond = (tokenCount / elapsedSeconds).toFixed(1);

                  // Call the streaming update callback
                  onStreamUpdate(accumulatedContent, {
                    tokenCount,
                    tokensPerSecond,
                    elapsedSeconds
                  });
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        content: accumulatedContent,
        type: 'text',
        metadata: {
          model: request.modelId,
          stats: {
            tokenCount,
            totalTimeSeconds: (Date.now() - startTime) / 1000,
            tokensPerSecond: (tokenCount / ((Date.now() - startTime) / 1000)).toFixed(1),
            startTime,
            endTime: Date.now()
          }
        }
      };
    } catch (error) {
      console.error('Error in streaming request:', error);
      throw error;
    }
  }

  private handleError(error: Error): never {
    console.error('Gemini Error:', error);
    throw new Error(error?.message || 'An unexpected error occurred');
  }

  /**
   * Fetch Gemini models from backend. Falls back to static list on error.
   */
  async getModels(): Promise<AIModel[]> {
    try {
      const response = await api.get<{
        models: Array<{
          name: string;
          version: string;
          displayName: string;
          description: string;
          inputTokenLimit: number;
          outputTokenLimit: number;
          supportedGenerationMethods: string[];
        }>
      }>('/api/gemini/models');
      return response.data.models.map(m => {
        // m.name is "models/{modelId}"
        const id = m.name.split('/')[1] || m.name;
        return {
          id,
          name: m.displayName || id,
          provider: 'gemini',
          category: 'chat',
          description: m.description,
          isConfigured: this.isConfigured(),
          isReasoner: false,
          color: '#4285F4',
          endpoint: 'chat',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportsFunctionCalling: (m.supportedGenerationMethods?.length ?? 0) > 0,
          supportsStreaming: true,
          rateLimits: {}
        } as AIModel;
      });
    } catch (error) {
      console.error('Error fetching Gemini models from backend:', error);
      // Fallback to static configuration
      return AI_MODELS.filter(model => model.provider === 'gemini');
    }
  }
}
