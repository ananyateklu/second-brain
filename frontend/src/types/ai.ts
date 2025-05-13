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
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok' | 'perplexity';
  category: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'function' | 'rag' | 'agent' | 'search' | 'research' | 'reasoning';
  description: string;
  isConfigured: boolean;
  isReasoner: boolean;
  color: string;
  endpoint: 'chat' | 'completions' | 'images' | 'audio' | 'embeddings' | 'rag' | 'agent' | 'search';
  rateLimits?: RateLimits;
  size?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExecutionStep {
  type: number;  // Using numeric enum values from backend
  content: string;
  timestamp: string;
  parentStep?: number | null;
  isSubStep?: boolean;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolExecution {
  name: string;
  type: string;
  description: string;
  parameters?: Record<string, unknown>;
  required_permissions?: string[];
  status: 'pending' | 'success' | 'error';
  result?: string;
  error?: string;
  execution_time?: number;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface FunctionCallMetadata {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  content: string | unknown;
  type: 'text' | 'image' | 'audio' | 'function_call' | 'step' | 'error';
  inputText?: string;
  contentBlocks?: ContentBlock[];
  executionSteps?: ExecutionStep[];
  metadata?: {
    model?: string;
    prompt?: string;
    revised_prompt?: string;
    context?: AccumulatedContext;
    tools_used?: ToolExecution[];
    parameters?: Record<string, unknown>;
    toolCalls?: Record<string, unknown>[];
    toolResults?: AnthropicToolResult[];
    usage?: TokenUsage;
    execution_time?: number;
    request_id?: string;
    functionCall?: FunctionCallMetadata;
    stats?: {
      tokenCount: number;
      totalTimeSeconds: number;
      tokensPerSecond: string;
      startTime: number;
      endTime: number;
    };
    [key: string]: unknown;
  };
  streaming?: boolean;
}

interface ContentBlock {
  type: string;
  text?: string;
  url?: string;
  // Add other properties as needed
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

// Anthropic-specific interfaces
export interface AnthropicToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
}

export interface AnthropicToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

export interface AnthropicResponse {
  id: string;
  content: AnthropicContentBlock[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicGeneratedFields {
  title?: string;
  content?: string;
  tags?: string[];
  [key: string]: unknown; // Allow for additional dynamic fields
}

export interface AccumulatedContext {
  title: string;
  content: string;
  tags: string[];
}

export interface AISettings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  localModelPath?: string;
  localModelParams?: {
    temperature: number;
    maxTokens: number;
  };
  contentSuggestions?: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok';
    modelId: string;
    temperature?: number;
    maxTokens?: number;
    systemMessage?: string;
    enabled?: boolean;
  };
  promptEnhancement?: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok';
    modelId: string;
    temperature?: number;
    maxTokens?: number;
    systemMessage?: string;
    enabled?: boolean;
  };
}