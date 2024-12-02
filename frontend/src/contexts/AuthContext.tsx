import React, { createContext, useState, useCallback, useEffect } from 'react';
import { AuthState } from '../types/auth';
import { authService, AuthResponse } from '../services/api/auth.service';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/shared/LoadingScreen';


interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    error: null,
    user: null,
  });

  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.login({ email, password });
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);

      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
    } catch (error: Error | unknown) {
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
        error: apiError.response?.data?.error || 'Registration failed',
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
        error: apiError.response?.data?.error || 'Password reset failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      await authService.logout();
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

  const fetchCurrentUser = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');

    if (!accessToken) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      setAuthState({
        isLoading: false,
        error: null,
        user: user,
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
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

    useEffect(() => {
      fetchCurrentUser();
    }, [fetchCurrentUser]);

    if (authState.isLoading) {
      return <LoadingScreen message="Authenticating..." />;
    }

    return (
      <AuthContext.Provider value={{ ...authState, login, register, resetPassword, logout, fetchCurrentUser }}>
        {children}
      </AuthContext.Provider>
    );
  }

export { AuthContext };
