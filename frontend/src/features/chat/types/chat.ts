import { RagContextNote } from '../../rag/types';

export interface ToolCall {
  toolName: string;
  arguments: string;
  result: string;
  executedAt: string;
  success: boolean;
}

export interface ChatMessage {
  role: string; // 'user' or 'assistant'
  content: string;
  timestamp: string;
  retrievedNotes?: RagContextNote[];
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  toolCalls?: ToolCall[];
}

export interface ChatConversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  ragEnabled: boolean;
  agentEnabled: boolean;
  agentCapabilities?: string;
  vectorStoreProvider?: string;
  messages: ChatMessage[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
  provider: string;
  model: string;
  ragEnabled?: boolean;
  agentEnabled?: boolean;
  agentCapabilities?: string;
  vectorStoreProvider?: string;
  userId?: string;
}

export interface UpdateConversationSettingsRequest {
  ragEnabled?: boolean;
  vectorStoreProvider?: string;
  agentEnabled?: boolean;
  agentCapabilities?: string;
}

export interface SendMessageRequest {
  content: string;
  temperature?: number;
  maxTokens?: number;
  useRag?: boolean;
  userId?: string;
  vectorStoreProvider?: string;
}

export interface ChatResponseWithRag {
  conversation: ChatConversation;
  retrievedNotes: RagContextNote[];
}

