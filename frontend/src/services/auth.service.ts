/**
 * Authentication Service
 * Handles authentication business logic and API calls
 */

import { API_ENDPOINTS, getApiBaseUrl } from '../lib/constants';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '../types/auth';

/**
 * Make unauthenticated API calls (for login/register)
 */
async function postUnauthenticated<T>(endpoint: string, body: unknown): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData: unknown = await response.json();
      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        ('error' in errorData || 'message' in errorData)
      ) {
        if ('error' in errorData && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if ('message' in errorData && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Authentication service for user auth operations
 */
export const authService = {
  /**
   * Login with email and password
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    return postUnauthenticated<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, request);
  },

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    return postUnauthenticated<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, request);
  },

  /**
   * Extract user from auth response
   */
  extractUser(response: AuthResponse): User {
    return {
      userId: response.userId,
      email: response.email,
      displayName: response.displayName,
      apiKey: response.apiKey,
    };
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  },

  /**
   * Validate login form
   */
  validateLoginForm(email: string, password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!this.validateEmail(email)) {
      errors.push('Invalid email format');
    }
    
    if (!password) {
      errors.push('Password is required');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate registration form
   */
  validateRegisterForm(
    email: string,
    password: string,
    confirmPassword: string,
    displayName?: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!this.validateEmail(email)) {
      errors.push('Invalid email format');
    }
    
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid && passwordValidation.message) {
      errors.push(passwordValidation.message);
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (displayName && displayName.length < 2) {
      errors.push('Display name must be at least 2 characters');
    }
    
    return { valid: errors.length === 0, errors };
  },
};

