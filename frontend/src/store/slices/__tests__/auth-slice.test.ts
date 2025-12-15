/**
 * Auth Slice Tests
 * Unit tests for authentication store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuthSlice } from '../auth-slice';
import { authService } from '../../../services/auth.service';
import { userPreferencesService } from '../../../services/user-preferences.service';
import type { AuthSlice, BoundStore } from '../../types';

// Mock services
vi.mock('../../../services/auth.service', () => ({
  authService: {
    validateLoginForm: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    extractUser: vi.fn(),
  },
}));

vi.mock('../../../services/user-preferences.service', () => ({
  userPreferencesService: {
    clearLocalPreferences: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  loggers: {
    auth: {
      error: vi.fn(),
    },
  },
}));

describe('authSlice', () => {
  // Store state container
  let state: Partial<BoundStore>;
  let slice: AuthSlice;

  // Mock set and get functions for Zustand
  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  // Mock loadPreferencesFromBackend and resetSettings (from other slices)
  const mockLoadPreferencesFromBackend = vi.fn();
  const mockResetSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize state with required methods from other slices
    state = {
      loadPreferencesFromBackend: mockLoadPreferencesFromBackend,
      resetSettings: mockResetSettings,
    };

    // Create slice
    // @ts-expect-error - Partial store mock
    slice = createAuthSlice(mockSet, mockGet, {});

    // Merge slice into state
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have null user', () => {
      expect(slice.user).toBeNull();
    });

    it('should have null token', () => {
      expect(slice.token).toBeNull();
    });

    it('should have isLoading false', () => {
      expect(slice.isLoading).toBe(false);
    });

    it('should have isAuthenticated false', () => {
      expect(slice.isAuthenticated).toBe(false);
    });

    it('should have null error', () => {
      expect(slice.error).toBeNull();
    });
  });

  // ============================================
  // Login Tests
  // ============================================
  describe('login', () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const mockResponse = {
      userId: 'user-123',
      token: 'jwt-token-123',
      email: 'test@example.com',
      displayName: 'Test User',
      isNewUser: false,
    };

    it('should set isLoading true and clear error on start', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      const loginPromise = slice.login('test@example.com', 'password123');

      // Check initial state change
      expect(mockSet).toHaveBeenCalledWith({ isLoading: true, error: null });

      await loginPromise;
    });

    it('should validate login form before calling API', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.login('test@example.com', 'password123');

      expect(authService.validateLoginForm).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should throw error if validation fails', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({
        valid: false,
        errors: ['Email is required'],
      });

      await expect(slice.login('', 'password')).rejects.toThrow('Email is required');
    });

    it('should call authService.login with credentials', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.login('test@example.com', 'password123');

      expect(authService.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password123',
      });
    });

    it('should set user, token, and isAuthenticated on success', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.login('test@example.com', 'password123');

      expect(mockSet).toHaveBeenCalledWith({
        user: mockUser,
        token: 'jwt-token-123',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('should load preferences after successful login', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.login('test@example.com', 'password123');

      expect(mockLoadPreferencesFromBackend).toHaveBeenCalledWith('user-123');
    });

    it('should not fail login if preferences fail to load', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);
      mockLoadPreferencesFromBackend.mockRejectedValue(new Error('Preferences error'));

      // Should not throw
      await expect(slice.login('test@example.com', 'password123')).resolves.toBeUndefined();
    });

    it('should set error and throw on login failure', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

      await expect(slice.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');

      expect(mockSet).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Invalid credentials',
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(authService.login).mockRejectedValue('String error');

      await expect(slice.login('test@example.com', 'password')).rejects.toBe('String error');

      expect(mockSet).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Failed to login',
      });
    });
  });

  // ============================================
  // Register Tests
  // ============================================
  describe('register', () => {
    const mockUser = {
      userId: 'user-456',
      email: 'new@example.com',
      displayName: 'New User',
    };

    const mockResponse = {
      userId: 'user-456',
      token: 'jwt-token-456',
      email: 'new@example.com',
      displayName: 'New User',
      isNewUser: true,
    };

    it('should set isLoading true on start', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      const registerPromise = slice.register('new@example.com', 'password123', 'New User');

      expect(mockSet).toHaveBeenCalledWith({ isLoading: true, error: null });

      await registerPromise;
    });

    it('should call authService.register with all params', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.register('new@example.com', 'password123', 'New User', 'newuser');

      expect(authService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
        username: 'newuser',
      });
    });

    it('should set user, token, and isAuthenticated on success', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.register('new@example.com', 'password123');

      expect(mockSet).toHaveBeenCalledWith({
        user: mockUser,
        token: 'jwt-token-456',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('should load preferences after successful registration', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);

      await slice.register('new@example.com', 'password123');

      expect(mockLoadPreferencesFromBackend).toHaveBeenCalledWith('user-456');
    });

    it('should not fail registration if preferences fail to load', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockResponse);
      vi.mocked(authService.extractUser).mockReturnValue(mockUser);
      mockLoadPreferencesFromBackend.mockRejectedValue(new Error('Preferences error'));

      await expect(slice.register('new@example.com', 'password123')).resolves.toBeUndefined();
    });

    it('should set error and throw on registration failure', async () => {
      vi.mocked(authService.register).mockRejectedValue(new Error('Email already exists'));

      await expect(slice.register('existing@example.com', 'password')).rejects.toThrow('Email already exists');

      expect(mockSet).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Email already exists',
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(authService.register).mockRejectedValue('String error');

      await expect(slice.register('test@example.com', 'password')).rejects.toBe('String error');

      expect(mockSet).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Failed to register',
      });
    });
  });

  // ============================================
  // Sign Out Tests
  // ============================================
  describe('signOut', () => {
    it('should clear user, token, and isAuthenticated', () => {
      slice.signOut();

      expect(mockSet).toHaveBeenCalledWith({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    });

    it('should clear local preferences', () => {
      slice.signOut();

      expect(userPreferencesService.clearLocalPreferences).toHaveBeenCalled();
    });

    it('should reset settings', () => {
      slice.signOut();

      expect(mockResetSettings).toHaveBeenCalled();
    });
  });

  // ============================================
  // Set User Tests
  // ============================================
  describe('setUser', () => {
    it('should set user and isAuthenticated to true', () => {
      const user = { userId: 'u1', email: 'test@test.com', displayName: 'Test User' };

      slice.setUser(user);

      expect(mockSet).toHaveBeenCalledWith({
        user,
        isAuthenticated: true,
      });
    });

    it('should set isAuthenticated to false when user is null', () => {
      slice.setUser(null);

      expect(mockSet).toHaveBeenCalledWith({
        user: null,
        isAuthenticated: false,
      });
    });
  });

  // ============================================
  // Set Token Tests
  // ============================================
  describe('setToken', () => {
    it('should set token', () => {
      slice.setToken('new-token');

      expect(mockSet).toHaveBeenCalledWith({ token: 'new-token' });
    });

    it('should set token to null', () => {
      slice.setToken(null);

      expect(mockSet).toHaveBeenCalledWith({ token: null });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('clearError', () => {
    it('should set error to null', () => {
      slice.clearError();

      expect(mockSet).toHaveBeenCalledWith({ error: null });
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      slice.setError('Something went wrong');

      expect(mockSet).toHaveBeenCalledWith({ error: 'Something went wrong' });
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      slice.setLoading(true);

      expect(mockSet).toHaveBeenCalledWith({ isLoading: true });
    });

    it('should set isLoading to false', () => {
      slice.setLoading(false);

      expect(mockSet).toHaveBeenCalledWith({ isLoading: false });
    });
  });
});
