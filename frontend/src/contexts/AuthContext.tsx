import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AuthState } from '../types/auth';
import { authService, AuthResponse } from '../services/api/auth.service';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/shared/LoadingScreen';
import { signalRService } from '../services/signalR';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    error: null,
    user: null,
  });

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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchCurrentUser]);

  // SignalR connection management
  useEffect(() => {
    let isActive = true;
    console.log('[SignalR] Auth state changed, user:', authState.user?.email);

    const initializeSignalR = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken || !isActive) {
          console.warn('[SignalR] No access token available or component unmounted');
          return;
        }

        console.log('[SignalR] Initializing connection...');

        // First, clean up any existing connection and wait
        await signalRService.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the token and ensure connection is started
        await signalRService.updateToken(accessToken);
        await signalRService.start();

        if (!isActive) return; // Check if still mounted
        console.log('[SignalR] Connection started');

        // Create a stable callback reference
        const handleStatsUpdate = async () => {
          if (!isActive) return;
          console.log('[SignalR] Received userstatsupdated event');
          await updateUserData();
          console.log('[SignalR] User data updated');
        };

        // Set up the event handler for user stats updates
        console.log('[SignalR] Setting up event handler for userstatsupdated');
        signalRService.on('userstatsupdated', handleStatsUpdate);

        return () => {
          if (isActive) {
            console.log('[SignalR] Cleaning up event handler and connection');
            signalRService.off('userstatsupdated', handleStatsUpdate);
            signalRService.stop();
          }
        };
      } catch (error) {
        console.error('[SignalR] Error initializing SignalR:', error);
        if (isActive) {
          // Retry after a delay if there was an error
          console.log('[SignalR] Will retry connection in 5 seconds...');
          setTimeout(initializeSignalR, 5000);
        }
      }
    };

    if (authState.user) {
      console.log('[SignalR] User authenticated, starting initialization');
      const cleanup = initializeSignalR();
      return () => {
        isActive = false;
        cleanup?.then(cleanupFn => {
          console.log('[SignalR] Running cleanup function');
          cleanupFn?.();
        });
      };
    } else {
      console.log('[SignalR] No user, skipping initialization');
    }
  }, [authState.user, updateUserData]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.login({ email, password });
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);

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

      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);

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
      authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
      updateUserData
    }),
    [authState, login, register, resetPassword, logout, fetchCurrentUser, updateUserData]
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
