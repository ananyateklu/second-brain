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
}

