/**
 * Application Constants
 * Centralized configuration for API endpoints, query keys, and app settings
 */

// ============================================
// User Constants
// ============================================

export const DEFAULT_USER_ID = 'default-user';

// ============================================
// API Configuration
// ============================================

/**
 * Get the base API URL from environment or default
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '/api';
};

/**
 * API Endpoints organized by domain
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },

  // Notes
  NOTES: {
    BASE: '/notes',
    BY_ID: (id: string) => `/notes/${id}`,
    IMPORT: '/notes/import',
  },

  // Chat / Conversations
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    CONVERSATION_BY_ID: (id: string) => `/chat/conversations/${id}`,
    CONVERSATION_SETTINGS: (id: string) => `/chat/conversations/${id}/settings`,
    MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    STREAM_MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages/stream`,
    GENERATE_IMAGE: (conversationId: string) => `/chat/conversations/${conversationId}/generate-image`,
    IMAGE_PROVIDERS: '/chat/image-generation/providers',
    IMAGE_SIZES: (provider: string, model?: string) => {
      const base = `/chat/image-generation/providers/${provider}/sizes`;
      return model ? `${base}?model=${encodeURIComponent(model)}` : base;
    },
  },

  // AI
  AI: {
    HEALTH: '/ai/health',
    HEALTH_PROVIDER: (provider: string) => `/ai/health/${provider}`,
    OLLAMA_PULL: '/ai/ollama/pull',
    OLLAMA_DELETE: (modelName: string) => `/ai/ollama/models/${encodeURIComponent(modelName)}`,
  },

  // Agent
  AGENT: {
    CHAT: (conversationId: string) => `/agent/chat/${conversationId}`,
    STREAM: (conversationId: string) => `/agent/stream/${conversationId}`,
    CAPABILITIES: '/agent/capabilities',
    PROVIDERS: '/agent/providers',
  },

  // RAG / Indexing
  INDEXING: {
    START: '/indexing/start',
    STATUS: (jobId: string) => `/indexing/status/${jobId}`,
    STATS: '/indexing/stats',
    REINDEX_NOTE: (noteId: string) => `/indexing/reindex/${noteId}`,
    DELETE_NOTES: '/indexing/notes',
  },

  // Statistics
  STATS: {
    AI: '/stats/ai',
    NOTES: '/stats/notes',
    DASHBOARD: '/stats/dashboard',
  },

  // User Preferences
  USER_PREFERENCES: {
    BY_USER: (userId: string) => `/userpreferences/${userId}`,
  },

  // Health Check
  HEALTH: {
    BASE: '/health',
    READY: '/health/ready',
    LIVE: '/health/live',
  },
} as const;

// ============================================
// Query Keys
// ============================================

/**
 * React Query cache keys organized by domain
 * Using factory pattern for consistent key generation
 */
export const QUERY_KEYS = {
  // Notes
  notes: {
    all: ['notes'] as const,
    lists: () => [...QUERY_KEYS.notes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QUERY_KEYS.notes.lists(), filters] as const,
    details: () => [...QUERY_KEYS.notes.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.notes.details(), id] as const,
  },

  // Conversations
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...QUERY_KEYS.conversations.all, 'list'] as const,
    list: (userId?: string) => [...QUERY_KEYS.conversations.lists(), { userId }] as const,
    details: () => [...QUERY_KEYS.conversations.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.conversations.details(), id] as const,
  },

  // Legacy conversation key for backwards compatibility
  conversation: (id: string | null) => ['conversation', id] as const,

  // AI Health
  aiHealth: {
    all: ['ai-health'] as const,
    health: (ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) => 
      [...QUERY_KEYS.aiHealth.all, { ollamaBaseUrl, useRemoteOllama }] as const,
    provider: (provider: string, ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) => 
      [...QUERY_KEYS.aiHealth.all, provider, { ollamaBaseUrl, useRemoteOllama }] as const,
  },

  // RAG / Indexing
  indexing: {
    all: ['indexing'] as const,
    stats: (userId?: string) => [...QUERY_KEYS.indexing.all, 'stats', userId] as const,
    job: (jobId: string) => [...QUERY_KEYS.indexing.all, 'job', jobId] as const,
  },

  // Statistics
  stats: {
    all: ['stats'] as const,
    ai: () => [...QUERY_KEYS.stats.all, 'ai'] as const,
    notes: () => [...QUERY_KEYS.stats.all, 'notes'] as const,
    dashboard: () => [...QUERY_KEYS.stats.all, 'dashboard'] as const,
  },

  // User Preferences
  userPreferences: {
    all: ['user-preferences'] as const,
    byUser: (userId: string) => [...QUERY_KEYS.userPreferences.all, userId] as const,
  },

  // Image Generation
  imageGeneration: {
    all: ['image-generation'] as const,
    providers: () => [...QUERY_KEYS.imageGeneration.all, 'providers'] as const,
    sizes: (provider: string, model?: string) => 
      [...QUERY_KEYS.imageGeneration.all, 'sizes', provider, model] as const,
  },
} as const;

// ============================================
// Application Settings
// ============================================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Default timeout settings (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 30000,      // 30 seconds
  STREAMING: 120000,       // 2 minutes
  FILE_UPLOAD: 60000,      // 1 minute
  HEALTH_CHECK: 10000,     // 10 seconds
  DEBOUNCE: 300,           // 300ms for search/input debounce
  AUTO_SAVE: 2000,         // 2 seconds for auto-save
} as const;

/**
 * Retry configuration
 */
export const RETRY = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,        // 1 second
  MAX_DELAY: 10000,        // 10 seconds
  BACKOFF_FACTOR: 2,
} as const;

/**
 * Cache durations (in milliseconds)
 */
export const CACHE = {
  STALE_TIME: 1000 * 60 * 5,    // 5 minutes
  GC_TIME: 1000 * 60 * 10,      // 10 minutes
  HEALTH_STALE: 1000 * 30,      // 30 seconds for health checks
} as const;

/**
 * File upload constraints
 */
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB
  MAX_IMAGES: 4,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/markdown'],
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  SETTINGS: 'second-brain-settings',
  THEME: 'second-brain-theme',
  UI_STATE: 'second-brain-ui',
  OLLAMA_DOWNLOADS: 'ollama-downloads',
} as const;

/**
 * AI Provider names (matching backend)
 */
export const AI_PROVIDERS = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GOOGLE: 'Gemini',
  XAI: 'Grok',
  OLLAMA: 'Ollama',
} as const;

/**
 * Vector store providers
 */
export const VECTOR_STORES = {
  POSTGRESQL: 'PostgreSQL',
  PINECONE: 'Pinecone',
} as const;
