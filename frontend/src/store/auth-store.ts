/**
 * Authentication Store
 * Manages user authentication state with service layer integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services';
import { userPreferencesService } from '../services';
import { STORAGE_KEYS } from '../lib/constants';
import type { User, AuthState } from '../types/auth';

// ============================================
// Store Interface
// ============================================

interface AuthActions {
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
  
  // User actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  
  // Error handling
  clearError: () => void;
  setError: (error: string) => void;
  
  // Loading state
  setLoading: (isLoading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================
// Store Implementation
// ============================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // ============================================
      // Auth Actions
      // ============================================

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate input
          const validation = authService.validateLoginForm(email, password);
          if (!validation.valid) {
            throw new Error(validation.errors[0]);
          }

          // Call auth service
          const response = await authService.login({ email, password });
          const user = authService.extractUser(response);

          set({
            user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences from backend
          try {
            await userPreferencesService.loadAndMergePreferences(response.userId);
          } catch (prefError) {
            console.error('Error loading user preferences:', { error: prefError });
            // Don't fail auth if preferences fail to load
          }
        } catch (error) {
          console.error('Login error:', { error });
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to login',
          });
          throw error;
        }
      },

      register: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Call auth service
          const response = await authService.register({ email, password, displayName });
          const user = authService.extractUser(response);

          set({
            user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences from backend
          try {
            await userPreferencesService.loadAndMergePreferences(response.userId);
          } catch (prefError) {
            console.error('Error loading user preferences:', { error: prefError });
            // Don't fail auth if preferences fail to load
          }
        } catch (error) {
          console.error('Registration error:', { error });
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to register',
          });
          throw error;
        }
      },

      signOut: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        
        // Clear local preferences
        userPreferencesService.clearLocalPreferences();
      },

      // ============================================
      // User Actions
      // ============================================

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token) => {
        set({ token });
      },

      // ============================================
      // Error Handling
      // ============================================

      clearError: () => {
        set({ error: null });
      },

      setError: (error) => {
        set({ error });
      },

      // ============================================
      // Loading State
      // ============================================

      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: STORAGE_KEYS.AUTH,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

/**
 * Select user from store
 */
export const selectUser = (state: AuthStore) => state.user;

/**
 * Select auth token
 */
export const selectToken = (state: AuthStore) => state.token;

/**
 * Select authentication status
 */
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

/**
 * Select loading status
 */
export const selectIsLoading = (state: AuthStore) => state.isLoading;

/**
 * Select error message
 */
export const selectError = (state: AuthStore) => state.error;

/**
 * Select user ID
 */
export const selectUserId = (state: AuthStore) => state.user?.userId ?? null;

/**
 * Select user email
 */
export const selectUserEmail = (state: AuthStore) => state.user?.email ?? null;

/**
 * Select user display name
 */
export const selectUserDisplayName = (state: AuthStore) => state.user?.displayName ?? null;

// ============================================
// Selector Hooks
// ============================================

/**
 * Hook to get just the user
 */
export const useUser = () => useAuthStore(selectUser);

/**
 * Hook to get just the auth status
 */
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);

/**
 * Hook to get just the user ID
 */
export const useUserId = () => useAuthStore(selectUserId);

/**
 * Hook to get auth loading state
 */
export const useAuthLoading = () => useAuthStore(selectIsLoading);

/**
 * Hook to get auth error
 */
export const useAuthError = () => useAuthStore(selectError);

/**
 * Hook to get auth actions only (no re-renders on state changes)
 */
export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    register: state.register,
    signOut: state.signOut,
    clearError: state.clearError,
  }));
