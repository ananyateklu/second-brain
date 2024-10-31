import { AIModel } from './ai';

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding';
  timestamp: string;
  model: AIModel;
  isLoading?: boolean;
} 