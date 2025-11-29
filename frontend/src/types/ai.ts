/**
 * AI Types
 * Types for AI providers, health checks, and model management
 */

/**
 * AI Provider health status
 */
export interface AIProviderHealth {
  provider: string;
  isHealthy: boolean;
  checkedAt: string;
  status: string;
  responseTimeMs: number;
  version?: string;
  availableModels?: string[];
  errorMessage?: string;
}

/**
 * AI Health check response
 */
export interface AIHealthResponse {
  checkedAt: string;
  providers: AIProviderHealth[];
}

/**
 * Ollama health check options
 */
export interface OllamaHealthOptions {
  ollamaBaseUrl?: string | null;
  useRemoteOllama?: boolean;
}

/**
 * Ollama model pull request
 */
export interface OllamaPullRequest {
  modelName: string;
  ollamaBaseUrl?: string | null;
  insecure?: boolean;
}

/**
 * Ollama pull progress update
 */
export interface OllamaPullProgress {
  status: string;
  digest?: string;
  totalBytes?: number;
  completedBytes?: number;
  percentage?: number;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number;
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Ollama pull callbacks
 */
export interface OllamaPullCallbacks {
  onProgress: (progress: OllamaPullProgress) => void;
  onComplete: (modelName: string) => void;
  onError: (error: string) => void;
}

/**
 * AI Model information
 */
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsStreaming?: boolean;
}

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;
  models: AIModel[];
  requiresApiKey: boolean;
  baseUrl?: string;
}

/**
 * Chat completion request options
 */
export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

