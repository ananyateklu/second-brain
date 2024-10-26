import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    error: null,
    user: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, validate credentials with your backend
      if (email && password) {
        setAuthState({
          isLoading: false,
          error: null,
          user: {
            id: '1',
            email,
            name: email.split('@')[0],
          },
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Invalid credentials',
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthState({
        isLoading: false,
        error: null,
        user: {
          id: '1',
          email,
          name,
        },
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Registration failed',
      }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, send password reset email
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Password reset failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      isLoading: false,
      error: null,
      user: null,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, register, resetPassword, logout }}>
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