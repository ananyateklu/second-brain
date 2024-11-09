export interface RateLimits {
  tpm?: number; // Tokens per minute
  rpm?: number; // Requests per minute
  rpd?: number; // Requests per day
  tpd?: number; // Tokens per day
  imagesPerMinute?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'llama' | 'grok';
  category: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'function';
  description: string;
  isConfigured: boolean;
  color: string;
  endpoint: 'chat' | 'completions' | 'images' | 'audio' | 'embeddings';
  rateLimits?: RateLimits;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExecutionStep {
  type: 'processing' | 'thinking' | 'function_call' | 'database_operation' | 'result';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
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
  timestamp: string;
  model: AIModel;
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
    result?: string;
  };
  isLoading?: boolean;
}