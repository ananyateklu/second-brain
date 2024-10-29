import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthState } from '../types/auth';
import { authService, AuthResponse } from '../services/api/auth.service';
import api from '../services/api/api';

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

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.login({ email, password });

      console.log('Login response:', response);

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);
      console.log('Tokens stored in localStorage:', {
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
      });

      // Optional: Call fetchCurrentUser if needed
      // await fetchCurrentUser();

      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.error || 'Invalid credentials',
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: AuthResponse = await authService.register({ email, password, name });

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);
      console.log('Login successful, response:', response);

      setAuthState({
        isLoading: false,
        error: null,
        user: response.user,
      });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.error || 'Registration failed',
      }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Implement your password reset logic here
      await authService.resetPassword(email);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.error || 'Password reset failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Handle logout error if necessary
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAuthState({
        isLoading: false,
        error: null,
        user: null,
      });
      window.location.href = '/login'; // Redirect to login
    }
  }, []);

  // AuthContext.tsx

  const fetchCurrentUser = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');
    console.log('Access token in fetchCurrentUser:', accessToken);

    if (!accessToken) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authService.getCurrentUser();
      console.log('Fetched user:', user);

      setAuthState({
        isLoading: false,
        error: null,
        user: user, // Set the user directly
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Clear tokens and state on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAuthState({
        isLoading: false,
        error: null,
        user: null,
      });
    }
  }, []);

  // **Initialize Auth State on Mount**
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider value={{ ...authState, login, register, resetPassword, logout, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
