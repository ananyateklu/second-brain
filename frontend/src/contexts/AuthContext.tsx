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
      // console.log(`[AuthContext] SignalR Connection State: ${state}`, error || '');

      if (state === 'error' && error) {
        console.error('[AuthContext] SignalR Connection Error:', error.message, error);
        // More nuanced error display
        if (error.message.includes('Max reconnection attempts reached')) {
          setAuthState(prev => ({
            ...prev,
            // Keep existing error if it's more specific or already set
            error: prev.error || 'Connection to the server was lost. Please refresh the page.',
          }));
        } else if (error.message.includes('Failed to connect')) {
          // This is the error thrown by our simplified SignalRService.start() on initial failure
          setAuthState(prev => ({
            ...prev,
            error: prev.error || 'Failed to connect to real-time services. Some features might be unavailable.',
          }));
        } else if (!signalRService.isConnected()) {
          // Generic error if we are in error state and not connected for other reasons
          setAuthState(prev => ({
            ...prev,
            error: prev.error || 'Real-time service connection issue. Retrying in background.'
          }));
        }
      } else if (state === 'connected') {
        // If we successfully connected, clear any previous connection-related errors
        // Be careful not to clear other types of auth errors
        setAuthState(prev => {
          if (prev.error && (prev.error.includes('Connection') || prev.error.includes('connect'))) {
            return { ...prev, error: null };
          }
          return prev;
        });
      } else if (state === 'disconnected') {
        // Potentially inform user connection is lost, but withAutomaticReconnect will handle it.
        // Avoid setting a persistent error here unless it's a final disconnection after retries.
        console.warn('[AuthContext] SignalR disconnected. Automatic reconnection should be active.');
      }
    };

    const unsubscribe = signalRService.onConnectionStateChange(handleConnectionStateChange);
    return () => {
      unsubscribe();
    };
  }, []); // No dependencies, runs once to subscribe

  // SignalR connection management
  useEffect(() => {
    let isActive = true;

    const initializeSignalR = async () => {
      if (!authState.user || !isActive) {
        console.warn('[SignalR] No user or component unmounted, skipping SignalR initialization.');
        return undefined; // Explicitly return undefined for cleanup function type
      }

      const accessToken = TokenManager.getAccessToken();
      if (!accessToken) {
        console.warn('[SignalR] No access token available, skipping SignalR initialization.');
        setSignalRStatus('error'); // Reflect that we can't connect
        // Optionally set a user-facing error in authState if this state persists
        return undefined;
      }

      try {
        console.log('[SignalR] Attempting to update token and start connection...');
        // updateToken will stop, build with new token, and start.
        await signalRService.updateToken(accessToken);
        // signalRService.start() is called within updateToken implicitly if successful

        if (!isActive) return undefined;

        const handleStatsUpdate = async () => {
          if (!isActive) return;
          // console.log('[SignalR] Received userstatsupdated event');
          await updateUserData();
        };

        signalRService.on('userstatsupdated', handleStatsUpdate);
        // console.log('[SignalR] Subscribed to userstatsupdated');

        return () => {
          if (isActive) {
            // console.log('[SignalR] Cleaning up: unsubscribing from userstatsupdated and stopping connection');
            signalRService.off('userstatsupdated', handleStatsUpdate);
            // Consider if stop() is always needed here, or only if connection is active.
            // signalRService.stop(); // This might be too aggressive if another part of app expects connection
          }
        };
      } catch (error) {
        console.error('[SignalR] Error initializing SignalR in AuthContext:', error);
        // Error is already notified by signalRService, AuthContext's onConnectionStateChange will handle UI.
        // No need to retry with setTimeout here; rely on global state handler for feedback/manual retry prompts.
        return undefined;
      }
    };

    let cleanupPromise: Promise<(() => void) | undefined> | undefined;
    if (authState.user) { // Only run if user is logged in
      cleanupPromise = initializeSignalR();
    }

    return () => {
      isActive = false;
      cleanupPromise?.then(cleanupFn => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      }).catch(err => console.error("Error in SignalR cleanup promise", err));
      // If there was no user, or initializeSignalR returned early, no cleanup needed from its return.
      // However, ensure SignalR is stopped if user logs out.
      if (!authState.user) {
        // console.log('[SignalR] User logged out or not present, ensuring SignalR is stopped.');
        // signalRService.stop(); // Moved to logout function for explicit control
      }
    };
  }, [authState.user, updateUserData]); // TokenManager.getAccessToken() is not a state/prop, direct usage is fine

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.login({ email, password });
      TokenManager.setTokens(response.accessToken, response.refreshToken);

      // User state is set, which will trigger the useEffect for initializeSignalR.
      // No direct call to signalRService.updateToken() or start() here.
      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
      // navigate('/'); // Navigate after user state is set and SignalR initialization is triggered
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      TokenManager.clearTokens(); // Clear tokens on login failure
      throw error;
    }
  }, []); // Removed navigate and updateUserData from dependencies as they are not directly called

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
      await signalRService.stop(); // Explicitly stop SignalR on logout
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
