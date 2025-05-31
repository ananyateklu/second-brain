import { AIModel, ExecutionStep } from './ai';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string | Blob | File;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code' | 'function' | 'function_call' | 'step' | 'error';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  isStreaming?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  transcription?: string;
  inputText?: string;
  progress?: number;
  metadata?: ImageMetadata | Record<string, unknown>;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
}

export interface ImageMetadata {
  model: string;
  prompt: string;
  revised_prompt?: string;
}