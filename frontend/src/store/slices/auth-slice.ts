/**
 * Authentication Slice
 * Manages user authentication state
 */

// Import directly to avoid circular deps through services barrel export
import { authService } from '../../services/auth.service';
import { userPreferencesService } from '../../services/user-preferences.service';
import { loggers } from '../../utils/logger';
import type { AuthSlice, SliceCreator } from '../types';

// Note: userPreferencesService is still needed for clearLocalPreferences in signOut

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  // Initial state
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  // ============================================
  // Auth Actions
  // ============================================

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      // Validate input
      const validation = authService.validateLoginForm(identifier, password);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      // Call auth service
      const response = await authService.login({ identifier, password });
      const user = authService.extractUser(response);

      set({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Load user preferences from backend and set in store
      try {
        await get().loadPreferencesFromBackend(response.userId);
      } catch (prefError) {
        loggers.auth.error('Error loading user preferences:', { error: prefError });
        // Don't fail auth if preferences fail to load
      }
    } catch (error) {
      loggers.auth.error('Login error:', { error });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to login',
      });
      throw error;
    }
  },

  register: async (email: string, password: string, displayName?: string, username?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Call auth service
      const response = await authService.register({ email, password, displayName, username });
      const user = authService.extractUser(response);

      set({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Load user preferences from backend and set in store
      try {
        await get().loadPreferencesFromBackend(response.userId);
      } catch (prefError) {
        loggers.auth.error('Error loading user preferences:', { error: prefError });
        // Don't fail auth if preferences fail to load
      }
    } catch (error) {
      loggers.auth.error('Registration error:', { error });
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

    // Reset settings to defaults
    get().resetSettings();
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
});
