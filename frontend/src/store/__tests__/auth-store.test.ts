/**
 * Auth Store Tests
 * Unit tests for authentication state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '../auth-store';
import { authService } from '../../services/auth.service';
import { userPreferencesService } from '../../services/user-preferences.service';

// Mock the services
vi.mock('../../services/auth.service', () => ({
    authService: {
        login: vi.fn(),
        register: vi.fn(),
        validateLoginForm: vi.fn(),
        extractUser: vi.fn(),
    },
}));

vi.mock('../../services/user-preferences.service', () => ({
    userPreferencesService: {
        loadAndMergePreferences: vi.fn(),
        clearLocalPreferences: vi.fn(),
    },
}));

describe('auth-store', () => {
    // Suppress expected console.error outputs during error handling tests
    const originalConsoleError = console.error;

    beforeEach(() => {
        // Reset the store before each test
        useAuthStore.setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
        });
        vi.clearAllMocks();
        // Suppress console.error for expected error scenarios
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        vi.restoreAllMocks();
    });

    // ============================================
    // Initial State Tests
    // ============================================
    describe('initial state', () => {
        it('should have null user initially', () => {
            // Act
            const state = useAuthStore.getState();

            // Assert
            expect(state.user).toBeNull();
        });

        it('should have null token initially', () => {
            // Act
            const state = useAuthStore.getState();

            // Assert
            expect(state.token).toBeNull();
        });

        it('should not be loading initially', () => {
            // Act
            const state = useAuthStore.getState();

            // Assert
            expect(state.isLoading).toBe(false);
        });

        it('should not be authenticated initially', () => {
            // Act
            const state = useAuthStore.getState();

            // Assert
            expect(state.isAuthenticated).toBe(false);
        });

        it('should have no error initially', () => {
            // Act
            const state = useAuthStore.getState();

            // Assert
            expect(state.error).toBeNull();
        });
    });

    // ============================================
    // Login Tests
    // ============================================
    describe('login', () => {
        it('should set loading state when login starts', async () => {
            // Arrange
            const mockResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                token: 'jwt-token',
            };

            vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
            vi.mocked(authService.login).mockResolvedValue(mockResponse);
            vi.mocked(authService.extractUser).mockReturnValue({
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
            });
            vi.mocked(userPreferencesService.loadAndMergePreferences).mockResolvedValue({});

            // Act
            const loginPromise = useAuthStore.getState().login('test@example.com', 'password123');

            // Assert - loading should be true while logging in
            expect(useAuthStore.getState().isLoading).toBe(true);

            await loginPromise;
        });

        it('should set user and token on successful login', async () => {
            // Arrange
            const mockResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                token: 'jwt-token',
            };
            const mockUser = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
            };

            vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
            vi.mocked(authService.login).mockResolvedValue(mockResponse);
            vi.mocked(authService.extractUser).mockReturnValue(mockUser);
            vi.mocked(userPreferencesService.loadAndMergePreferences).mockResolvedValue({});

            // Act
            await useAuthStore.getState().login('test@example.com', 'password123');

            // Assert
            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.token).toBe('jwt-token');
            expect(state.isAuthenticated).toBe(true);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should set error on login failure', async () => {
            // Arrange
            vi.mocked(authService.validateLoginForm).mockReturnValue({ valid: true, errors: [] });
            vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

            // Act & Assert
            await expect(useAuthStore.getState().login('test@example.com', 'wrong-password'))
                .rejects.toThrow('Invalid credentials');

            const state = useAuthStore.getState();
            expect(state.error).toBe('Invalid credentials');
            expect(state.isLoading).toBe(false);
            expect(state.isAuthenticated).toBe(false);
        });

        it('should validate login form before calling service', async () => {
            // Arrange
            vi.mocked(authService.validateLoginForm).mockReturnValue({
                valid: false,
                errors: ['Email is required']
            });

            // Act & Assert
            await expect(useAuthStore.getState().login('', 'password'))
                .rejects.toThrow('Email is required');

            expect(authService.login).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // Register Tests
    // ============================================
    describe('register', () => {
        it('should set user and token on successful registration', async () => {
            // Arrange
            const mockResponse = {
                userId: 'new-user-123',
                email: 'newuser@example.com',
                displayName: 'New User',
                token: 'new-jwt-token',
            };
            const mockUser = {
                userId: 'new-user-123',
                email: 'newuser@example.com',
                displayName: 'New User',
            };

            vi.mocked(authService.register).mockResolvedValue(mockResponse);
            vi.mocked(authService.extractUser).mockReturnValue(mockUser);
            vi.mocked(userPreferencesService.loadAndMergePreferences).mockResolvedValue({});

            // Act
            await useAuthStore.getState().register('newuser@example.com', 'SecurePass123', 'New User');

            // Assert
            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.token).toBe('new-jwt-token');
            expect(state.isAuthenticated).toBe(true);
        });

        it('should set error on registration failure', async () => {
            // Arrange
            vi.mocked(authService.register).mockRejectedValue(new Error('Email already exists'));

            // Act & Assert
            await expect(useAuthStore.getState().register('existing@example.com', 'SecurePass123'))
                .rejects.toThrow('Email already exists');

            const state = useAuthStore.getState();
            expect(state.error).toBe('Email already exists');
            expect(state.isLoading).toBe(false);
        });
    });

    // ============================================
    // SignOut Tests
    // ============================================
    describe('signOut', () => {
        it('should clear user and token on sign out', () => {
            // Arrange - set up authenticated state
            useAuthStore.setState({
                user: { userId: 'user-123', email: 'test@example.com', displayName: 'Test' },
                token: 'jwt-token',
                isAuthenticated: true,
            });

            // Act
            useAuthStore.getState().signOut();

            // Assert
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should call clearLocalPreferences on sign out', () => {
            // Arrange
            useAuthStore.setState({
                user: { userId: 'user-123', email: 'test@example.com', displayName: 'Test' },
                token: 'jwt-token',
                isAuthenticated: true,
            });

            // Act
            useAuthStore.getState().signOut();

            // Assert
            expect(userPreferencesService.clearLocalPreferences).toHaveBeenCalled();
        });
    });

    // ============================================
    // setUser Tests
    // ============================================
    describe('setUser', () => {
        it('should set user and update isAuthenticated', () => {
            // Arrange
            const user = { userId: 'user-123', email: 'test@example.com', displayName: 'Test' };

            // Act
            useAuthStore.getState().setUser(user);

            // Assert
            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
        });

        it('should set isAuthenticated to false when user is null', () => {
            // Arrange - set up authenticated state first
            useAuthStore.setState({
                user: { userId: 'user-123', email: 'test@example.com', displayName: 'Test' },
                isAuthenticated: true,
            });

            // Act
            useAuthStore.getState().setUser(null);

            // Assert
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });

    // ============================================
    // setToken Tests
    // ============================================
    describe('setToken', () => {
        it('should set token', () => {
            // Act
            useAuthStore.getState().setToken('new-token');

            // Assert
            expect(useAuthStore.getState().token).toBe('new-token');
        });

        it('should allow setting token to null', () => {
            // Arrange
            useAuthStore.setState({ token: 'existing-token' });

            // Act
            useAuthStore.getState().setToken(null);

            // Assert
            expect(useAuthStore.getState().token).toBeNull();
        });
    });

    // ============================================
    // Error Handling Tests
    // ============================================
    describe('error handling', () => {
        it('should clear error', () => {
            // Arrange
            useAuthStore.setState({ error: 'Some error message' });

            // Act
            useAuthStore.getState().clearError();

            // Assert
            expect(useAuthStore.getState().error).toBeNull();
        });

        it('should set error', () => {
            // Act
            useAuthStore.getState().setError('New error message');

            // Assert
            expect(useAuthStore.getState().error).toBe('New error message');
        });
    });

    // ============================================
    // Loading State Tests
    // ============================================
    describe('loading state', () => {
        it('should set loading state', () => {
            // Act
            useAuthStore.getState().setLoading(true);

            // Assert
            expect(useAuthStore.getState().isLoading).toBe(true);
        });

        it('should clear loading state', () => {
            // Arrange
            useAuthStore.setState({ isLoading: true });

            // Act
            useAuthStore.getState().setLoading(false);

            // Assert
            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });
});

