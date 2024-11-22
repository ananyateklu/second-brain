import { AIModel, ExecutionStep } from './ai';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Blob | File;
  metadata?: ImageMetadata;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code' | 'function';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  inputText?: string;
  progress?: number;
} 

export interface ImageMetadata {
  model: string;
  prompt: string;
  revised_prompt?: string;
}