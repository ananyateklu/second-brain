/**
 * Chat Service
 * Handles chat/conversation business logic and API calls
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS, DEFAULT_USER_ID, getApiBaseUrl } from '../lib/constants';
import { useAuthStore } from '../store/auth-store';
import type {
  ChatConversation,
  ChatResponseWithRag,
  CreateConversationRequest,
  SendMessageRequest,
  UpdateConversationSettingsRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageProviderInfo,
  StreamingCallbacks,
  GenerateSuggestedPromptsRequest,
  SuggestedPromptsResponse,
  ChatSession,
  SessionStats,
  SessionHistory,
  StartSessionRequest,
  EndSessionRequest,
} from '../types/chat';
import type { RagContextNote } from '../types/rag';

/**
 * Chat service for conversation and message operations
 */
export const chatService = {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string = DEFAULT_USER_ID): Promise<ChatConversation[]> {
    return apiClient.get<ChatConversation[]>(
      `${API_ENDPOINTS.CHAT.CONVERSATIONS}?userId=${userId}`
    );
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(id: string): Promise<ChatConversation> {
    return apiClient.get<ChatConversation>(API_ENDPOINTS.CHAT.CONVERSATION_BY_ID(id));
  },

  /**
   * Create a new conversation
   */
  async createConversation(request: CreateConversationRequest): Promise<ChatConversation> {
    return apiClient.post<ChatConversation>(API_ENDPOINTS.CHAT.CONVERSATIONS, request);
  },

  /**
   * Update conversation settings
   */
  async updateConversationSettings(
    conversationId: string,
    request: UpdateConversationSettingsRequest
  ): Promise<ChatConversation> {
    return apiClient.patch<ChatConversation>(
      API_ENDPOINTS.CHAT.CONVERSATION_SETTINGS(conversationId),
      request
    );
  },

  /**
   * Send a message (non-streaming)
   */
  async sendMessage(
    conversationId: string,
    request: SendMessageRequest
  ): Promise<ChatResponseWithRag> {
    return apiClient.post<ChatResponseWithRag>(
      API_ENDPOINTS.CHAT.MESSAGES(conversationId),
      request
    );
  },

  /**
   * Send a message with streaming response
   */
  async streamMessage(
    conversationId: string,
    request: SendMessageRequest,
    callbacks: StreamingCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}${API_ENDPOINTS.CHAT.STREAM_MESSAGES(conversationId)}`;

    const authStore = useAuthStore.getState();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

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

      await this.processSSEStream(reader, callbacks);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Stream was cancelled by user
          return;
        }
        callbacks.onError?.(error);
      } else {
        callbacks.onError?.(new Error('Unknown error occurred during streaming'));
      }
      throw error;
    }
  },

  /**
   * Process SSE stream from response
   */
  async processSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (separated by \n\n)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

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

        this.handleSSEEvent(eventType, data, callbacks);
      }
    }
  },

  /**
   * Handle individual SSE event
   */
  handleSSEEvent(eventType: string, data: string, callbacks: StreamingCallbacks): void {
    switch (eventType) {
      case 'message':
      case 'data':
        if (data) {
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
          } catch {
            callbacks.onError?.(new Error(data));
          }
        }
        break;

      default:
        if (data && eventType === 'message') {
          const unescapedData = data.replace(/\\n/g, '\n');
          callbacks.onToken(unescapedData);
        }
        break;
    }
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.CHAT.CONVERSATION_BY_ID(id));
  },

  /**
   * Bulk delete multiple conversations in a single request
   */
  async bulkDeleteConversations(conversationIds: string[]): Promise<{ deletedCount: number; message: string }> {
    return apiClient.post<{ deletedCount: number; message: string }>(
      API_ENDPOINTS.CHAT.BULK_DELETE,
      { conversationIds }
    );
  },

  // ============================================
  // Image Generation
  // ============================================

  /**
   * Generate an image
   */
  async generateImage(
    conversationId: string,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    return apiClient.post<ImageGenerationResponse>(
      API_ENDPOINTS.CHAT.GENERATE_IMAGE(conversationId),
      request
    );
  },

  /**
   * Get available image generation providers
   */
  async getImageGenerationProviders(): Promise<ImageProviderInfo[]> {
    return apiClient.get<ImageProviderInfo[]>(API_ENDPOINTS.CHAT.IMAGE_PROVIDERS);
  },

  /**
   * Get available image sizes for a provider
   */
  async getImageGenerationSizes(provider: string, model?: string): Promise<string[]> {
    return apiClient.get<string[]>(API_ENDPOINTS.CHAT.IMAGE_SIZES(provider, model));
  },

  // ============================================
  // Suggested Prompts
  // ============================================

  /**
   * Generate AI-powered suggested prompts based on user's notes
   */
  async generateSuggestedPrompts(
    request: GenerateSuggestedPromptsRequest = {}
  ): Promise<SuggestedPromptsResponse> {
    return apiClient.post<SuggestedPromptsResponse>(
      API_ENDPOINTS.CHAT.SUGGESTED_PROMPTS,
      request
    );
  },

  // ============================================
  // Chat Session Tracking (PostgreSQL 18 Temporal Features)
  // ============================================

  /**
   * Start a new chat session
   * @param conversationId - The conversation to track
   * @param deviceInfo - Optional JSON string with device information
   * @param userAgent - Optional user agent string
   */
  async startSession(
    conversationId: string,
    deviceInfo?: string,
    userAgent?: string
  ): Promise<ChatSession> {
    const request: StartSessionRequest = {
      conversationId,
      deviceInfo,
      userAgent,
    };
    return apiClient.post<ChatSession>(API_ENDPOINTS.CHAT.SESSIONS.START, request);
  },

  /**
   * End an active chat session
   * @param sessionId - The session ID to end
   * @param data - Optional final counts for the session
   */
  async endSession(
    sessionId: string,
    data?: EndSessionRequest
  ): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.CHAT.SESSIONS.END(sessionId), data || {});
  },

  /**
   * Get chat session statistics for the authenticated user
   */
  async getSessionStats(): Promise<SessionStats> {
    return apiClient.get<SessionStats>(API_ENDPOINTS.CHAT.SESSIONS.STATS);
  },

  /**
   * Get all active sessions for the authenticated user
   */
  async getActiveSessions(): Promise<ChatSession[]> {
    return apiClient.get<ChatSession[]>(API_ENDPOINTS.CHAT.SESSIONS.ACTIVE);
  },

  /**
   * Get session history for a specific conversation
   * @param conversationId - The conversation ID
   * @param skip - Number of sessions to skip (pagination)
   * @param take - Number of sessions to return (pagination)
   */
  async getConversationSessions(
    conversationId: string,
    skip?: number,
    take?: number
  ): Promise<SessionHistory> {
    let url = API_ENDPOINTS.CHAT.SESSIONS.BY_CONVERSATION(conversationId);
    const params: string[] = [];
    if (skip !== undefined) params.push(`skip=${skip}`);
    if (take !== undefined) params.push(`take=${take}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiClient.get<SessionHistory>(url);
  },

  /**
   * Get session history for the authenticated user
   * @param since - Optional start date filter (ISO string)
   * @param until - Optional end date filter (ISO string)
   */
  async getSessionHistory(since?: string, until?: string): Promise<SessionHistory> {
    let url = API_ENDPOINTS.CHAT.SESSIONS.HISTORY;
    const params: string[] = [];
    if (since) params.push(`since=${encodeURIComponent(since)}`);
    if (until) params.push(`until=${encodeURIComponent(until)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiClient.get<SessionHistory>(url);
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Generate a title from message content
   */
  generateTitle(content: string, maxLength = 50): string {
    const cleanContent = content.trim().replace(/\n/g, ' ');
    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }
    return cleanContent.slice(0, maxLength - 3) + '...';
  },

  /**
   * Sort conversations by update date (newest first)
   */
  sortConversationsByDate(conversations: ChatConversation[]): ChatConversation[] {
    return [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Count total tokens in a conversation
   */
  countConversationTokens(conversation: ChatConversation): {
    inputTokens: number;
    outputTokens: number;
  } {
    let inputTokens = 0;
    let outputTokens = 0;

    for (const message of conversation.messages) {
      inputTokens += message.inputTokens || 0;
      outputTokens += message.outputTokens || 0;
    }

    return { inputTokens, outputTokens };
  },

  /**
   * Get the last message from a conversation
   */
  getLastMessage(conversation: ChatConversation): string {
    if (conversation.messages.length === 0) return '';
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return lastMessage.content;
  },

  /**
   * Check if a message contains retrieved notes
   */
  hasRetrievedNotes(notes: RagContextNote[] | undefined): boolean {
    return notes !== undefined && notes.length > 0;
  },
};

