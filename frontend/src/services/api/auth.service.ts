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

export interface XPBreakdownResponse {
  counts: {
    notes: number;
    ideas: number;
    archivedNotes: number;
    archivedIdeas: number;
    tasks: {
      total: number;
      completed: number;
    };
    reminders: {
      total: number;
      completed: number;
    };
  };
  xpBreakdown: {
    bySource: {
      source: string;
      totalXP: number;
    }[];
    byAction: {
      action: string;
      totalXP: number;
    }[];
  };
}

export interface XPHistoryItem {
  id: string;
  source: string;
  action: string;
  amount: number;
  createdAt: string;
  itemId?: string;
  itemTitle?: string;
}

export interface XPHistoryResponse {
  history: XPHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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
  },

  getXPBreakdown: async (): Promise<XPBreakdownResponse> => {
    const response = await api.get<XPBreakdownResponse>('/auth/me/xp-breakdown');
    return response.data;
  },

  getXPHistory: async (page: number = 1, pageSize: number = 20): Promise<XPHistoryResponse> => {
    const response = await api.get<XPHistoryResponse>(`/auth/me/xp-history?page=${page}&pageSize=${pageSize}`);
    return response.data;
  }
};