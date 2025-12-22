/**
 * Authentication Types
 * Aligned with backend DTOs for auth operations
 */

/**
 * User entity (aligned with backend UserResponse)
 */
export interface User {
  userId: string;
  email: string;
  username?: string;
  displayName: string;
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  identifier: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  displayName?: string;
}

/**
 * Authentication response from login/register
 */
export interface AuthResponse {
  userId: string;
  email: string;
  username?: string;
  displayName: string;
  apiKey?: string;
  token: string;
  isNewUser: boolean;
}

/**
 * Authentication state for store
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * User preferences (aligned with backend UserPreferencesResponse)
 */
export interface UserPreferences {
  chatProvider: string | null;
  chatModel: string | null;
  vectorStoreProvider: 'PostgreSQL' | 'Pinecone';
  defaultNoteView: 'list' | 'grid';
  itemsPerPage: number;
  fontSize: 'small' | 'medium' | 'large';
  enableNotifications: boolean;
  ollamaRemoteUrl: string | null;
  useRemoteOllama: boolean;
  rerankingProvider: string | null;
  // Note Summary settings
  noteSummaryEnabled: boolean;
  noteSummaryProvider: string | null;
  noteSummaryModel: string | null;
  // RAG Feature Toggles
  ragEnableHyde: boolean;
  ragEnableQueryExpansion: boolean;
  ragEnableHybridSearch: boolean;
  ragEnableReranking: boolean;
  ragEnableAnalytics: boolean;
  // RAG Advanced Settings - Tier 1: Core Retrieval
  ragTopK: number;
  ragSimilarityThreshold: number;
  ragInitialRetrievalCount: number;
  ragMinRerankScore: number;
  // RAG Advanced Settings - Tier 2: Hybrid Search
  ragVectorWeight: number;
  ragBm25Weight: number;
  ragMultiQueryCount: number;
  ragMaxContextLength: number;
}

/**
 * Update user preferences request
 */
export interface UpdateUserPreferencesRequest {
  chatProvider?: string | null;
  chatModel?: string | null;
  vectorStoreProvider?: 'PostgreSQL' | 'Pinecone';
  defaultNoteView?: 'list' | 'grid';
  itemsPerPage?: number;
  fontSize?: 'small' | 'medium' | 'large';
  enableNotifications?: boolean;
  ollamaRemoteUrl?: string | null;
  useRemoteOllama?: boolean;
  rerankingProvider?: string | null;
  // Note Summary settings
  noteSummaryEnabled?: boolean;
  noteSummaryProvider?: string | null;
  noteSummaryModel?: string | null;
  // RAG Feature Toggles
  ragEnableHyde?: boolean;
  ragEnableQueryExpansion?: boolean;
  ragEnableHybridSearch?: boolean;
  ragEnableReranking?: boolean;
  ragEnableAnalytics?: boolean;
  // RAG Advanced Settings - Tier 1: Core Retrieval
  ragTopK?: number;
  ragSimilarityThreshold?: number;
  ragInitialRetrievalCount?: number;
  ragMinRerankScore?: number;
  // RAG Advanced Settings - Tier 2: Hybrid Search
  ragVectorWeight?: number;
  ragBm25Weight?: number;
  ragMultiQueryCount?: number;
  ragMaxContextLength?: number;
}

