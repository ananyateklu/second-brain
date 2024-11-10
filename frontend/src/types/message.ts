import { AIModel, ExecutionStep } from './ai';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Blob;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  inputText?: string;
} 