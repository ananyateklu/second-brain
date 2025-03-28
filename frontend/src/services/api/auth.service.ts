import api from './api';
import { TokenManager } from '../../contexts/AuthContext';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  experiencePoints: number;
  experience: number;
  level: number;
  avatar: string;
  xpForNextLevel: number;
  levelProgress: number;
  achievementCount: number;
  totalXPFromAchievements: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async resetPassword(email: string): Promise<void> {
    await api.post('/auth/reset-password', { email });
  },

  refreshToken: async (data: { refreshToken: string }) => {
    const response = await api.post('/auth/refresh-token', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout() {
    TokenManager.clearTokens();
  }
};