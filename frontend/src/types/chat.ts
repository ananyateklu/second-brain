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
  /** Text content streamed before this tool was invoked. Used for interleaved timeline display. */
  preToolText?: string;
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

// ============================================
// Grok/X.AI-specific Feature Types
// ============================================

/**
 * Grok Think Mode options
 */
export interface GrokThinkOptions {
  /** Whether think mode is enabled */
  enabled: boolean;
  /** Effort level for thinking: low, medium, high */
  effort: 'low' | 'medium' | 'high';
  /** Whether to include reasoning in response */
  includeReasoning?: boolean;
}

/**
 * Grok thinking step from Think Mode
 */
export interface GrokThinkingStep {
  /** Step number in the reasoning process */
  step: number;
  /** The thought or reasoning content */
  thought: string;
  /** Optional conclusion for this step */
  conclusion?: string;
}

/**
 * Grok Live Search options
 */
export interface GrokSearchOptions {
  /** Search mode: auto, on, off */
  mode: 'auto' | 'on' | 'off';
  /** Sources to search: web, x */
  sources: ('web' | 'x')[];
  /** Recency filter: hour, day, week, month */
  recency: 'hour' | 'day' | 'week' | 'month';
  /** Maximum number of results */
  maxResults: number;
}

/**
 * Grok search source from Live Search or DeepSearch
 */
export interface GrokSearchSource {
  /** URL of the source */
  url: string;
  /** Title of the source */
  title: string;
  /** Snippet or excerpt */
  snippet: string;
  /** Type of source: web, x_post, news */
  sourceType: 'web' | 'x_post' | 'news';
  /** When the content was published */
  publishedAt?: string;
  /** Relevance score (0-1) */
  relevanceScore?: number;
}

/**
 * Grok DeepSearch options
 */
export interface GrokDeepSearchOptions {
  /** Whether DeepSearch is enabled */
  enabled: boolean;
  /** Maximum sources to search */
  maxSources: number;
  /** Maximum time in seconds */
  maxTimeSeconds: number;
  /** Focus areas for the search */
  focusAreas?: string[];
}

/**
 * Grok DeepSearch result
 */
export interface GrokDeepSearchResult {
  /** Summary of findings */
  summary: string;
  /** Sources found */
  sources: GrokSearchSource[];
  /** Key findings organized by topic */
  keyFindings: Record<string, string>;
  /** Analysis of the findings */
  analysis: string;
}

// ============================================
// Gemini-specific Feature Types
// ============================================

/**
 * Grounding source from Google Search (Gemini only)
 */
export interface GroundingSource {
  /** URL of the source */
  uri: string;
  /** Title of the source page */
  title: string;
  /** Relevant snippet from the source */
  snippet?: string;
}

/**
 * Code execution result from Python sandbox (Gemini only)
 */
export interface CodeExecutionResult {
  /** The executed code */
  code: string;
  /** Programming language (typically "python") */
  language: string;
  /** Output from code execution */
  output: string;
  /** Whether execution completed successfully */
  success: boolean;
  /** Error message if execution failed */
  errorMessage?: string;
}

/**
 * Gemini context cache entry (Gemini only)
 * Represents a cached context on Gemini's servers for reducing latency and costs.
 */
export interface GeminiContextCache {
  /** Local database ID */
  id: string;
  /** Cache name from Gemini API (e.g., "cachedContents/abc123") */
  cacheName: string;
  /** Human-readable display name */
  displayName: string;
  /** Model this cache was created for (e.g., "gemini-2.0-flash") */
  model: string;
  /** SHA-256 hash of the cached content */
  contentHash: string;
  /** User ID who owns this cache */
  userId: string;
  /** Estimated token count of the cached content */
  tokenCount?: number;
  /** When the cache was created */
  createdAt: string;
  /** When the cache will expire */
  expiresAt: string;
  /** Whether the cache is still valid (not expired) */
  isValid: boolean;
}

/**
 * Request to create a Gemini context cache (Gemini only)
 */
export interface CreateGeminiCacheRequest {
  /** The model to create the cache for */
  model: string;
  /** Human-readable display name */
  displayName: string;
  /** The content to cache (large text, documents, etc.) */
  content: string;
  /** Optional system instruction to cache */
  systemInstruction?: string;
  /** Time-to-live in minutes (defaults to 60) */
  ttlMinutes?: number;
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  retrievedNotes?: RagContextNote[];
  /** Input tokens for this message (user messages store full context tokens) */
  inputTokens?: number;
  /** Output tokens for this message (assistant messages) */
  outputTokens?: number;
  /** Whether token counts are actual provider values (true) or estimates (false) */
  tokensActual?: boolean;
  /** Tokens used for reasoning/thinking (Claude extended thinking, Gemini thinking mode) */
  reasoningTokens?: number;
  /** Tokens used to create prompt cache (Claude) */
  cacheCreationTokens?: number;
  /** Tokens read from prompt cache (Claude) */
  cacheReadTokens?: number;
  /** Tokens used by RAG context */
  ragContextTokens?: number;
  /** Number of RAG chunks included in context */
  ragChunksCount?: number;
  /** Tokens used for tool definitions (agent mode) */
  toolDefinitionTokens?: number;
  /** Tokens used for tool arguments (agent mode) */
  toolArgumentTokens?: number;
  /** Tokens used for tool results (agent mode) */
  toolResultTokens?: number;
  /** Duration in milliseconds */
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
  /** Grounding sources from Google Search (Gemini only) */
  groundingSources?: GroundingSource[];
  /** Code execution result from Python sandbox (Gemini only) */
  codeExecutionResult?: CodeExecutionResult;
  /** Extended thinking/reasoning process (Gemini 2.0+ thinking mode) */
  thinkingProcess?: string;
  /** Grok search sources from Live Search (Grok only) */
  grokSearchSources?: GrokSearchSource[];
  /** Grok DeepSearch result (Grok only) */
  deepSearchResult?: GrokDeepSearchResult;
  /** Grok thinking steps from Think Mode (Grok only) */
  grokThinkingSteps?: GrokThinkingStep[];
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
  /** Google Search grounding enabled by default for this conversation (Gemini only) */
  groundingEnabled?: boolean;
  /** Python code execution enabled by default for this conversation (Gemini only) */
  codeExecutionEnabled?: boolean;
  /** Thinking mode enabled by default for this conversation (Gemini 2.0+ only) */
  thinkingEnabled?: boolean;
  /** Grok Think Mode enabled for this conversation (Grok only) */
  grokThinkModeEnabled?: boolean;
  /** Grok Live Search enabled for this conversation (Grok only) */
  grokSearchEnabled?: boolean;
  /** Grok DeepSearch enabled for this conversation (Grok only) */
  grokDeepSearchEnabled?: boolean;
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
  /** Enable Google Search grounding by default for this conversation (Gemini only) */
  groundingEnabled?: boolean;
  /** Enable Python code execution by default for this conversation (Gemini only) */
  codeExecutionEnabled?: boolean;
  /** Enable thinking mode by default for this conversation (Gemini 2.0+ only) */
  thinkingEnabled?: boolean;
  /** Enable Grok Think Mode for this conversation (Grok only) */
  grokThinkModeEnabled?: boolean;
  /** Enable Grok Live Search for this conversation (Grok only) */
  grokSearchEnabled?: boolean;
  /** Enable Grok DeepSearch for this conversation (Grok only) */
  grokDeepSearchEnabled?: boolean;
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
  /** Enable Google Search grounding for this message (Gemini only) */
  enableGrounding?: boolean;
  /** Enable Python code execution for this message (Gemini only) */
  enableCodeExecution?: boolean;
  /** Enable thinking mode for extended reasoning (Gemini 2.0+ only) */
  enableThinking?: boolean;
  /** Name of a cached context to use for this message (Gemini only) */
  contextCacheName?: string;
  /** Token budget for thinking process (Gemini only) */
  thinkingBudget?: number;
  /** Enable Grok Think Mode for this message (Grok only) */
  enableGrokThinkMode?: boolean;
  /** Grok Think Mode options (Grok only) */
  grokThinkOptions?: GrokThinkOptions;
  /** Enable Grok Live Search for this message (Grok only) */
  enableGrokSearch?: boolean;
  /** Grok Search options (Grok only) */
  grokSearchOptions?: GrokSearchOptions;
  /** Enable Grok DeepSearch for this message (Grok only) */
  enableGrokDeepSearch?: boolean;
  /** Grok DeepSearch options (Grok only) */
  grokDeepSearchOptions?: GrokDeepSearchOptions;
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
  /** Called when grounding sources are received (Gemini only) */
  onGroundingSources?: (sources: GroundingSource[]) => void;
  /** Called when code execution result is received (Gemini only) */
  onCodeExecution?: (result: CodeExecutionResult) => void;
  /** Called when thinking process is received (Gemini 2.0+ only) */
  onThinking?: (thinking: string) => void;
  /** Called when Grok search sources are received (Grok only) */
  onGrokSearchSources?: (sources: GrokSearchSource[]) => void;
  /** Called when Grok DeepSearch result is received (Grok only) */
  onGrokDeepSearch?: (result: GrokDeepSearchResult) => void;
  /** Called when Grok thinking step is received (Grok only) */
  onGrokThinkingStep?: (step: GrokThinkingStep) => void;
}

/**
 * Data received at end of streaming
 */
export interface StreamEndData {
  inputTokens?: number;
  outputTokens?: number;
  /** Whether token counts are actual provider values (true) or estimates (false) */
  tokensActual?: boolean;
  /** Tokens used by RAG context */
  ragContextTokens?: number;
  /** Number of RAG chunks included in context */
  ragChunksCount?: number;
  /** Tokens used to create prompt cache (Claude) */
  cacheCreationTokens?: number;
  /** Tokens read from prompt cache (Claude) */
  cacheReadTokens?: number;
  /** Tokens used for reasoning/thinking */
  reasoningTokens?: number;
  durationMs?: number;
  /** RAG query log ID for feedback submission */
  ragLogId?: string;
  /** Grounding sources from Google Search (Gemini only) */
  groundingSources?: GroundingSource[];
  /** Code execution result from Python sandbox (Gemini only) */
  codeExecutionResult?: CodeExecutionResult;
  /** Extended thinking/reasoning process (Gemini 2.0+ only) */
  thinkingProcess?: string;
  /** Grok search sources from Live Search (Grok only) */
  grokSearchSources?: GrokSearchSource[];
  /** Grok DeepSearch result (Grok only) */
  grokDeepSearchResult?: GrokDeepSearchResult;
  /** Grok thinking steps from Think Mode (Grok only) */
  grokThinkingSteps?: GrokThinkingStep[];
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
  /** Grounding sources from Google Search (Gemini only) */
  groundingSources?: GroundingSource[];
  /** Code execution result from Python sandbox (Gemini only) */
  codeExecutionResult?: CodeExecutionResult;
  /** Thinking process content (Gemini 2.0+ only) */
  thinkingProcess?: string;
  /** Grok search sources from Live Search (Grok only) */
  grokSearchSources?: GrokSearchSource[];
  /** Grok DeepSearch result (Grok only) */
  grokDeepSearchResult?: GrokDeepSearchResult;
  /** Grok thinking steps from Think Mode (Grok only) */
  grokThinkingSteps?: GrokThinkingStep[];
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

// ============================================
// Chat Session Types (PostgreSQL 18 Temporal Features)
// ============================================

/**
 * Device information for a chat session
 */
export interface SessionDeviceInfo {
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: string;
  platform?: string;
  isMobile?: boolean;
  isDesktop?: boolean;
  isTauriApp?: boolean;
}

/**
 * Chat session entity (aligned with backend ChatSessionResponse)
 */
export interface ChatSession {
  id: string;
  userId: string;
  conversationId: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  messagesSent: number;
  messagesReceived: number;
  tokensUsed: number;
  deviceInfo: SessionDeviceInfo | null;
  createdAt: string;
}

/**
 * Session statistics (aligned with backend SessionStatsResponse)
 */
export interface SessionStats {
  totalSessions: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalTokensUsed: number;
  avgSessionDurationMinutes: number;
  uniqueConversations: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  activeSessions: number;
}

/**
 * Session history response (aligned with backend SessionHistoryResponse)
 */
export interface SessionHistory {
  conversationId?: string;
  userId?: string;
  totalCount: number;
  sessions: ChatSession[];
}

/**
 * Request to start a chat session
 */
export interface StartSessionRequest {
  conversationId: string;
  deviceInfo?: string;
  userAgent?: string;
}

/**
 * Request to end a chat session
 */
export interface EndSessionRequest {
  messagesSent?: number;
  messagesReceived?: number;
  tokensUsed?: number;
}

