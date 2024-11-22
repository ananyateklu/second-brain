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
  inputText?: string;
  contentBlocks?: ContentBlock[];
  executionSteps?: ExecutionStep[];
  metadata?: {
    model?: string;
    prompt?: string;
    revised_prompt?: string;
    parameters?: Record<string, unknown>;
    toolCalls?: Record<string, unknown>[];
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

export interface AIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, {
        type: string;
        description: string;
        exampleValue: string;
      }>;
      required: string[];
    };
  };
}

export interface GrokFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, {
        type: string;
        description: string;
        exampleValue: string;
      }>;
      required: string[];
    };
  };
}