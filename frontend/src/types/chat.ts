/**
 * Chat Types
 * Aligned with backend Chat DTOs
 */

import type { RagContextNote } from './rag';

/**
 * Tool call information in chat messages
 */
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

/**
 * Generated image from image generation requests
 */
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

/**
 * Chat message entity
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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
  /** RAG query log ID for feedback submission (only on assistant messages with RAG) */
  ragLogId?: string;
  /** User feedback on RAG response quality ('thumbs_up' or 'thumbs_down') */
  ragFeedback?: string;
}

/**
 * Chat conversation entity
 */
export interface ChatConversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  ragEnabled: boolean;
  agentEnabled: boolean;
  /** Whether automatic RAG context retrieval is enabled for agent mode (defaults to true) */
  agentRagEnabled?: boolean;
  imageGenerationEnabled: boolean;
  agentCapabilities?: string;
  vectorStoreProvider?: string;
  messages: ChatMessage[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create conversation request (aligned with backend CreateConversationRequest)
 */
export interface CreateConversationRequest {
  title?: string;
  provider: string;
  model: string;
  ragEnabled?: boolean;
  agentEnabled?: boolean;
  agentRagEnabled?: boolean;
  imageGenerationEnabled?: boolean;
  agentCapabilities?: string;
  vectorStoreProvider?: string;
  userId?: string;
}

/**
 * Update conversation settings request
 */
export interface UpdateConversationSettingsRequest {
  ragEnabled?: boolean;
  vectorStoreProvider?: string;
  agentEnabled?: boolean;
  agentRagEnabled?: boolean;
  agentCapabilities?: string;
}

/**
 * Send message request (aligned with backend SendMessageRequest)
 */
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

/**
 * Chat response with RAG context
 */
export interface ChatResponseWithRag {
  conversation: ChatConversation;
  retrievedNotes: RagContextNote[];
  /** RAG query log ID for feedback submission */
  ragLogId?: string;
}

// ============================================
// Image Generation Types
// ============================================

/**
 * Image generation request
 */
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

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  success: boolean;
  images: GeneratedImage[];
  model: string;
  provider: string;
  error?: string;
  conversationId: string;
}

/**
 * Image provider information
 */
export interface ImageProviderInfo {
  provider: string;
  models: string[];
  isEnabled: boolean;
}

// ============================================
// Streaming Types
// ============================================

/**
 * Streaming message callbacks
 */
export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onRag?: (notes: RagContextNote[]) => void;
  onStart?: () => void;
  onEnd?: (data: StreamEndData) => void;
  onError?: (error: Error) => void;
}

/**
 * Data received at end of streaming
 */
export interface StreamEndData {
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  /** RAG query log ID for feedback submission */
  ragLogId?: string;
}

/**
 * Combined streaming state
 */
export interface CombinedStreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
}

// ============================================
// Suggested Prompts Types
// ============================================

/**
 * Request to generate AI-powered suggested prompts
 */
export interface GenerateSuggestedPromptsRequest {
  /** The AI provider to use for generating prompts */
  provider?: string;
  /** The model to use for generating prompts */
  model?: string;
  /** Number of prompts to generate (default: 4) */
  count?: number;
}

/**
 * A single suggested prompt
 */
export interface SuggestedPrompt {
  /** Unique identifier for the prompt */
  id: string;
  /** Short label displayed on the prompt chip */
  label: string;
  /** Full prompt template that will be inserted when clicked */
  promptTemplate: string;
  /** Category/icon type for the prompt */
  category: 'summarize' | 'analyze' | 'create' | 'explore';
}

/**
 * Response from generating suggested prompts
 */
export interface SuggestedPromptsResponse {
  /** Whether the generation was successful */
  success: boolean;
  /** List of generated prompt suggestions */
  prompts: SuggestedPrompt[];
  /** Error message if generation failed */
  error?: string;
  /** The provider used for generation */
  provider: string;
  /** The model used for generation */
  model: string;
}

