import { apiClient } from '../../../lib/api-client';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { useAuthStore } from '../../../store/auth-store';
import {
  ChatConversation,
  ChatResponseWithRag,
  CreateConversationRequest,
  SendMessageRequest,
  UpdateConversationSettingsRequest,
} from '../types/chat';

export const chatApi = {
  async getConversations(userId: string = DEFAULT_USER_ID): Promise<ChatConversation[]> {
    return apiClient.get<ChatConversation[]>(`/chat/conversations?userId=${userId}`);
  },

  async getConversation(id: string): Promise<ChatConversation> {
    return apiClient.get<ChatConversation>(`/chat/conversations/${id}`);
  },

  async createConversation(request: CreateConversationRequest): Promise<ChatConversation> {
    return apiClient.post<ChatConversation>('/chat/conversations', request);
  },

  async updateConversationSettings(
    conversationId: string,
    request: UpdateConversationSettingsRequest
  ): Promise<ChatConversation> {
    return apiClient.patch<ChatConversation>(
      `/chat/conversations/${conversationId}/settings`,
      request
    );
  },

  async sendMessage(
    conversationId: string,
    request: SendMessageRequest
  ): Promise<ChatResponseWithRag> {
    return apiClient.post<ChatResponseWithRag>(
      `/chat/conversations/${conversationId}/messages`,
      request
    );
  },

  async streamMessage(
    conversationId: string,
    request: SendMessageRequest,
    callbacks: {
      onToken: (token: string) => void;
      onRag?: (notes: any[]) => void;
      onStart?: () => void;
      onEnd?: (data: any) => void;
      onError?: (error: Error) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    // Use same base URL as apiClient (port 5001 by default)
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const url = `${apiUrl}/chat/conversations/${conversationId}/messages/stream`;

    // Get auth token from store
    const authStore = useAuthStore.getState();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if available
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal,
        credentials: 'include',
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

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;

          const lines = message.split('\n');
          let eventType = 'message';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              data = line.substring(6);
            }
          }

          // Handle different event types
          switch (eventType) {
            case 'message':
            case 'data':
              if (data) {
                // Unescape newlines
                const unescapedData = data.replace(/\\n/g, '\n');
                callbacks.onToken(unescapedData);
              }
              break;

            case 'start':
              callbacks.onStart?.();
              break;

            case 'rag':
              if (data) {
                try {
                  const ragData = JSON.parse(data);
                  callbacks.onRag?.(ragData.retrievedNotes || []);
                } catch (e) {
                  console.error('Failed to parse RAG data:', { data, error: e });
                }
              }
              break;

            case 'end':
              if (data) {
                try {
                  const endData = JSON.parse(data);
                  callbacks.onEnd?.(endData);
                } catch (e) {
                  console.error('Failed to parse end data:', { data, error: e });
                  callbacks.onEnd?.({});
                }
              } else {
                callbacks.onEnd?.({});
              }
              break;

            case 'error':
              if (data) {
                try {
                  const errorData = JSON.parse(data);
                  callbacks.onError?.(new Error(errorData.error || 'Streaming error'));
                } catch (e) {
                  callbacks.onError?.(new Error(data));
                }
              }
              break;

            default:
              // Handle default data events
              if (data && eventType === 'message') {
                const unescapedData = data.replace(/\\n/g, '\n');
                callbacks.onToken(unescapedData);
              }
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user');
        } else {
          callbacks.onError?.(error);
        }
      } else {
        callbacks.onError?.(new Error('Unknown error occurred during streaming'));
      }
      throw error;
    }
  },

  async deleteConversation(id: string): Promise<void> {
    return apiClient.delete<void>(`/chat/conversations/${id}`);
  },
};
