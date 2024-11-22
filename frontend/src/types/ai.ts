export interface RateLimits {
  tpm?: number;           // Tokens per minute
  rpm?: number;           // Requests per minute
  rpd?: number;           // Requests per day
  tpd?: number;           // Tokens per day
  maxInputTokens?: number;  // Maximum input context length
  maxOutputTokens?: number; // Maximum output response length
  imagesPerMinute?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'llama' | 'grok';
  category: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'function' | 'rag';
  description: string;
  isConfigured: boolean;
  color: string;
  endpoint: 'chat' | 'completions' | 'images' | 'audio' | 'embeddings' | 'rag';
  rateLimits?: RateLimits;
  size?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExecutionStep {
  type: 'processing' | 'thinking' | 'function_call' | 'database_operation' | 'result';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding';
  contentBlocks?: ContentBlock[];
  executionSteps?: ExecutionStep[];
  metadata?: {
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

interface ContentBlock {
  type: string;
  text?: string;
  url?: string;
  // Add other properties as needed
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code' | 'function';
  timestamp: string;
  model?: AIModel;
  metadata?: Record<string, unknown>;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  isStreaming?: boolean;
}