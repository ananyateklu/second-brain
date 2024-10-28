import api from '../../services/api/api';
import { LoginFormData } from '../../types/auth';

export const authService = {
  login: async (data: LoginFormData) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (data: { refreshToken: string }) => {
    const response = await api.post('/auth/refresh-token', data);
    return response.data;
  }
};