import { AIModel } from '../../types/ai';

export const AI_MODELS: AIModel[] = [
  // OpenAI GPT-4 Models
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    category: 'chat',
    description: 'Most capable base GPT-4 model',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'chat',
    rateLimits: {
      tpm: 10000,
      rpm: 500,
      rpd: 10000,
      tpd: 100000,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    category: 'chat',
    description: 'Enhanced GPT-4 with higher rate limits',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'chat',
    rateLimits: {
      tpm: 30000,
      rpm: 500,
      tpd: 90000,
    },
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Optimized',
    provider: 'openai',
    category: 'chat',
    description: 'Optimized version of GPT-4',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'chat',
    rateLimits: {
      tpm: 30000,
      rpm: 500,
      tpd: 90000,
    },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4 Optimized Mini',
    provider: 'openai',
    category: 'chat',
    description: 'Lightweight GPT-4 with higher token limits',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'chat',
    rateLimits: {
      tpm: 200000,
      rpm: 500,
      rpd: 10000,
      tpd: 2000000,
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    category: 'chat',
    description: 'Fast and cost-effective chat model',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'chat',
    rateLimits: {
      tpm: 200000,
      rpm: 500,
      rpd: 10000,
      tpd: 2000000,
    },
  },
  // OpenAI Embedding Models
  {
    id: 'text-embedding-3-small',
    name: 'Text Embedding 3 Small',
    provider: 'openai',
    category: 'embedding',
    description: 'Efficient text embedding generation',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'embeddings',
    rateLimits: {
      tpm: 1000000,
      rpm: 3000,
      tpd: 3000000,
    },
  },
  // OpenAI Image Models
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'openai',
    category: 'image',
    description: 'Advanced image generation',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'images',
    rateLimits: {
      rpm: 500,
      imagesPerMinute: 5,
    },
  },
  // OpenAI Audio Models
  {
    id: 'whisper-1',
    name: 'Whisper v1',
    provider: 'openai',
    category: 'audio',
    description: 'Speech to text transcription',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'audio',
    rateLimits: {
      rpm: 500,
    },
  },
  {
    id: 'tts-1',
    name: 'TTS-1',
    provider: 'openai',
    category: 'audio',
    description: 'Text to speech conversion',
    isConfigured: true,
    color: '#0d9488',
    endpoint: 'audio',
    rateLimits: {
      rpm: 500,
    },
  },
  // Anthropic Models (Mocked for now)
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    category: 'chat',
    description: 'Most capable Claude model',
    isConfigured: true,
    color: '#f97316',
    endpoint: 'chat',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    category: 'chat',
    description: 'Balanced performance and efficiency',
    isConfigured: true,
    color: '#f97316',
    endpoint: 'chat',
  },
];