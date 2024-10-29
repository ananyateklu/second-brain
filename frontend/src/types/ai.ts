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
  provider: 'openai' | 'anthropic' | 'gemini';
  category: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
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

export interface AIResponse {
  content: string;
  type: 'text' | 'image' | 'audio';
  contentBlocks?: ContentBlock[];
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