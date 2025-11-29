import { RagContextNote } from '../../rag/types';

export interface ToolCall {
  toolName: string;
  arguments: string;
  result: string;
  executedAt: string;
  success: boolean;
}

/**
 * Image content for multimodal messages
 */
export interface MessageImage {
  /** Base64-encoded image data (without data URL prefix) */
  base64Data: string;
  /** MIME type of the image (e.g., 'image/jpeg', 'image/png') */
  mediaType: string;
  /** Original filename (optional) */
  fileName?: string;
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
  /** Attached images for multimodal messages */
  images?: MessageImage[];
  /** Generated images from image generation requests */
  generatedImages?: GeneratedImage[];
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
  /** Attached images for multimodal messages */
  images?: MessageImage[];
}

export interface ChatResponseWithRag {
  conversation: ChatConversation;
  retrievedNotes: RagContextNote[];
}

// Image Generation Types
export interface GeneratedImage {
  /** Base64-encoded image data */
  base64Data?: string;
  /** URL to the generated image */
  url?: string;
  /** Revised/enhanced prompt used by the model */
  revisedPrompt?: string;
  /** MIME type of the image */
  mediaType: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

export interface ImageGenerationRequest {
  /** The text prompt describing the image to generate */
  prompt: string;
  /** The AI provider to use (e.g., "OpenAI", "Gemini", "Grok") */
  provider: string;
  /** The model to use (e.g., "dall-e-3", "grok-2-image") */
  model?: string;
  /** Size of the generated image (e.g., "1024x1024") */
  size?: string;
  /** Quality level ("standard" or "hd") */
  quality?: string;
  /** Style ("vivid" or "natural") */
  style?: string;
  /** Number of images to generate */
  count?: number;
}

export interface ImageGenerationResponse {
  success: boolean;
  images: GeneratedImage[];
  model: string;
  provider: string;
  error?: string;
  conversationId: string;
}

export interface ImageProviderInfo {
  provider: string;
  models: string[];
  isEnabled: boolean;
}

