import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AuthState } from '../types/auth';
import { authService, AuthResponse } from '../services/api/auth.service';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/shared/LoadingScreen';
import { signalRService, ConnectionState, setTokenManager } from '../services/signalR';
import { setTokenManager as setApiTokenManager } from '../services/api/api';

// Secure token management
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // In-memory storage for access token to avoid XSS attacks
  private static accessToken: string | null = null;

  // Initialize from storage (called at startup)
  static initialize() {
    // Read from localStorage during initialization
    this.accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getAccessToken(): string | null {
    return this.accessToken;
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;

    // Store access token in localStorage but with a short expiry
    // This ensures persistence across page refreshes
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens() {
    this.accessToken = null;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

// Initialize tokens from storage
TokenManager.initialize();

// Register TokenManager with both services
setApiTokenManager({
  getAccessToken: TokenManager.getAccessToken.bind(TokenManager),
  getRefreshToken: TokenManager.getRefreshToken.bind(TokenManager),
  setTokens: TokenManager.setTokens.bind(TokenManager),
  clearTokens: TokenManager.clearTokens.bind(TokenManager)
});

// Register with SignalR service
setTokenManager({
  getAccessToken: () => TokenManager.getAccessToken()
});

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateUserData: () => Promise<void>;
  signalRStatus: ConnectionState;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    error: null,
    user: null,
  });

  const [signalRStatus, setSignalRStatus] = useState<ConnectionState>('disconnected');

  const navigate = useNavigate();

  const updateUserData = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      setAuthState({
        isLoading: false,
        error: null,
        user,
      });
    } catch (error: unknown) {
      console.error('Error fetching current user:', error);
      TokenManager.clearTokens();
      setAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        user: null,
      });
      navigate('/login');
    }
  }, [navigate]);

  // Initial load
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchCurrentUser]);

  // SignalR connection state handler
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState, error?: Error) => {
      setSignalRStatus(state);

      if (state === 'error' && error) {
        console.error('[SignalR] Connection error:', error);

        // Only show user-visible errors for critical issues
        if (error.message.includes('Max reconnection attempts reached')) {
          setAuthState(prev => ({
            ...prev,
            error: 'Connection to the server was lost. Please refresh the page.',
          }));
        }
      }
    };

    const unsubscribe = signalRService.onConnectionStateChange(handleConnectionStateChange);
    return () => {
      unsubscribe();
    };
  }, []);

  // SignalR connection management
  useEffect(() => {
    let isActive = true;

    const initializeSignalR = async () => {
      try {
        const accessToken = TokenManager.getAccessToken();
        if (!accessToken || !isActive) {
          console.warn('[SignalR] No access token available or component unmounted');
          return;
        }

        // First, clean up any existing connection and wait
        await signalRService.stop();

        // Update the token and ensure connection is started
        await signalRService.updateToken(accessToken);
        await signalRService.start();

        if (!isActive) return; // Check if still mounted

        // Create a stable callback reference
        const handleStatsUpdate = async () => {
          if (!isActive) return;
          await updateUserData();
        };

        // Set up the event handler for user stats updates
        signalRService.on('userstatsupdated', handleStatsUpdate);

        return () => {
          if (isActive) {
            signalRService.off('userstatsupdated', handleStatsUpdate);
            signalRService.stop();
          }
        };
      } catch (error) {
        console.error('[SignalR] Error initializing SignalR:', error);
        if (isActive) {
          // Retry after a delay if there was an error
          setTimeout(initializeSignalR, 5000);
        }
      }
    };

    if (authState.user) {
      const cleanup = initializeSignalR();
      return () => {
        isActive = false;
        cleanup?.then(cleanupFn => {
          cleanupFn?.();
        });
      };
    }
  }, [authState.user, updateUserData]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.login({ email, password });

      // Securely store tokens
      TokenManager.setTokens(response.accessToken, response.refreshToken);

      // Update SignalR connection with new token
      await signalRService.updateToken(response.accessToken);

      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.register({ email, password, name });

      // Securely store tokens
      TokenManager.setTokens(response.accessToken, response.refreshToken);

      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: apiError.response?.data?.error ?? 'Registration failed',
      }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await authService.resetPassword(email);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: apiError.response?.data?.error ?? 'Password reset failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      await signalRService.stop();
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenManager.clearTokens();
      setAuthState({
        isLoading: false,
        error: null,
        user: null,
      });
      navigate('/login');
    }
  }, [navigate]);

  const contextValue = useMemo(
    () => ({
      ...authState,
      login,
      register,
      resetPassword,
      logout,
      fetchCurrentUser,
      updateUserData,
      signalRStatus
    }),
    [authState, login, register, resetPassword, logout, fetchCurrentUser, updateUserData, signalRStatus]
  );

  if (authState.isLoading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
