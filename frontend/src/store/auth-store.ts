import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './settings-store';

export interface User {
  userId: string;
  email: string;
  displayName: string;
  apiKey?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
}

// Helper to make unauthenticated API calls (login/register)
async function postAuth<T>(endpoint: string, body: unknown): Promise<T> {
  const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}`
    : '/api';
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
      else if (errorData.message) errorMessage = errorData.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await postAuth<{
            userId: string;
            email: string;
            displayName: string;
            apiKey?: string;
            token: string;
            isNewUser: boolean;
          }>('/auth/login', { email, password });

          set({
            user: {
              userId: response.userId,
              email: response.email,
              displayName: response.displayName,
              apiKey: response.apiKey,
            },
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences from backend
          try {
            await useSettingsStore.getState().loadPreferencesFromBackend(response.userId);
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
          const response = await postAuth<{
            userId: string;
            email: string;
            displayName: string;
            apiKey?: string;
            token: string;
            isNewUser: boolean;
          }>('/auth/register', { email, password, displayName });

          set({
            user: {
              userId: response.userId,
              email: response.email,
              displayName: response.displayName,
              apiKey: response.apiKey,
            },
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences from backend
          try {
            await useSettingsStore.getState().loadPreferencesFromBackend(response.userId);
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
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token) => {
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
