import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, AuthResponse, LoginData, RegisterData } from '../services/api';

interface AuthState {
  user: AuthResponse['user'] | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null
  });

  const login = useCallback(async (data: LoginData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login(data);
      setState(prev => ({ ...prev, user: response.user }));
      navigate('/dashboard');
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || 'Failed to login'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.register(data);
      setState(prev => ({ ...prev, user: response.user }));
      navigate('/dashboard');
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || 'Failed to register'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  const logout = useCallback(() => {
    authService.logout();
    setState({ user: null, isLoading: false, error: null });
    navigate('/login');
  }, [navigate]);

  return {
    ...state,
    login,
    register,
    logout
  };
}