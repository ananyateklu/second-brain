/**
 * Auth Service Tests
 * Unit tests for authentication validation logic
 */

import { describe, it, expect } from 'vitest';
import { authService } from '../auth.service';
import type { AuthResponse } from '../../types/auth';

describe('authService', () => {
    // ============================================
    // validateEmail Tests
    // ============================================
    describe('validateEmail', () => {
        it('should return true for valid email format', () => {
            // Arrange & Act & Assert
            expect(authService.validateEmail('test@example.com')).toBe(true);
            expect(authService.validateEmail('user.name@domain.co.uk')).toBe(true);
            expect(authService.validateEmail('user+tag@example.org')).toBe(true);
        });

        it('should return false for email without @', () => {
            // Act
            const result = authService.validateEmail('testexample.com');

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for email without domain', () => {
            // Act
            const result = authService.validateEmail('test@');

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for email without local part', () => {
            // Act
            const result = authService.validateEmail('@example.com');

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for email with spaces', () => {
            // Act
            const result = authService.validateEmail('test @example.com');

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for empty string', () => {
            // Act
            const result = authService.validateEmail('');

            // Assert
            expect(result).toBe(false);
        });
    });

    // ============================================
    // validatePassword Tests
    // ============================================
    describe('validatePassword', () => {
        it('should return valid for a strong password', () => {
            // Arrange
            const password = 'SecurePass123';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.message).toBeUndefined();
        });

        it('should return error for password less than 8 characters', () => {
            // Arrange
            const password = 'Short1A';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Password must be at least 8 characters');
        });

        it('should return error for password without uppercase letter', () => {
            // Arrange
            const password = 'lowercase123';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Password must contain at least one uppercase letter');
        });

        it('should return error for password without lowercase letter', () => {
            // Arrange
            const password = 'UPPERCASE123';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Password must contain at least one lowercase letter');
        });

        it('should return error for password without number', () => {
            // Arrange
            const password = 'NoNumbersHere';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Password must contain at least one number');
        });

        it('should accept password with exactly 8 characters', () => {
            // Arrange
            const password = 'Valid1Aa';

            // Act
            const result = authService.validatePassword(password);

            // Assert
            expect(result.valid).toBe(true);
        });
    });

    // ============================================
    // validateLoginForm Tests
    // ============================================
    describe('validateLoginForm', () => {
        it('should return valid for correct email and password', () => {
            // Arrange
            const identifier = 'test@example.com';
            const password = 'anyPassword';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return valid for username and password', () => {
            // Arrange
            const identifier = 'testuser123';
            const password = 'anyPassword';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return error for empty identifier', () => {
            // Arrange
            const identifier = '';
            const password = 'anyPassword';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Email or Username is required');
        });

        it('should return error for whitespace-only identifier', () => {
            // Arrange
            const identifier = '   ';
            const password = 'anyPassword';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Email or Username is required');
        });

        it('should return error for invalid email format when @ is present', () => {
            // Arrange
            const identifier = 'invalid@email';  // Has @ but invalid format
            const password = 'anyPassword';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid email format');
        });

        it('should return error for empty password', () => {
            // Arrange
            const identifier = 'test@example.com';
            const password = '';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password is required');
        });

        it('should return multiple errors for multiple invalid fields', () => {
            // Arrange
            const identifier = '';
            const password = '';

            // Act
            const result = authService.validateLoginForm(identifier, password);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Email or Username is required');
            expect(result.errors).toContain('Password is required');
        });
    });

    // ============================================
    // validateRegisterForm Tests
    // ============================================
    describe('validateRegisterForm', () => {
        it('should return valid for correct registration data', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'SecurePass123';
            const displayName = 'Test User';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword, displayName);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return error for empty email', () => {
            // Act
            const result = authService.validateRegisterForm('', 'SecurePass123', 'SecurePass123');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Email is required');
        });

        it('should return error for invalid email format', () => {
            // Act
            const result = authService.validateRegisterForm('invalid-email', 'SecurePass123', 'SecurePass123');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid email format');
        });

        it('should return error for weak password', () => {
            // Act
            const result = authService.validateRegisterForm('test@example.com', 'weak', 'weak');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must be at least 8 characters');
        });

        it('should return error when passwords do not match', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'DifferentPass123';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Passwords do not match');
        });

        it('should return error for display name less than 2 characters', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'SecurePass123';
            const displayName = 'A';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword, displayName);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Display name must be at least 2 characters');
        });

        it('should accept empty display name', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'SecurePass123';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should accept undefined display name', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'SecurePass123';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword, undefined);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should accept display name with exactly 2 characters', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'SecurePass123';
            const confirmPassword = 'SecurePass123';
            const displayName = 'AB';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword, displayName);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should return multiple errors for multiple validation failures', () => {
            // Arrange
            const email = 'invalid';
            const password = 'weak';
            const confirmPassword = 'different';
            const displayName = 'A';

            // Act
            const result = authService.validateRegisterForm(email, password, confirmPassword, displayName);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(2);
        });
    });

    // ============================================
    // extractUser Tests
    // ============================================
    describe('extractUser', () => {
        it('should extract user data from auth response', () => {
            // Arrange
            const response: AuthResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                token: 'jwt-token-here',
                apiKey: 'api-key-123',
                isNewUser: false,
            };

            // Act
            const user = authService.extractUser(response);

            // Assert
            expect(user.userId).toBe('user-123');
            expect(user.email).toBe('test@example.com');
            expect(user.displayName).toBe('Test User');
            expect(user.apiKey).toBe('api-key-123');
        });

        it('should not include token in extracted user', () => {
            // Arrange
            const response: AuthResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                token: 'jwt-token-here',
                isNewUser: false,
            };

            // Act
            const user = authService.extractUser(response);

            // Assert
            expect(user).not.toHaveProperty('token');
        });

        it('should handle response without apiKey', () => {
            // Arrange
            const response: AuthResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                token: 'jwt-token-here',
                isNewUser: false,
            };

            // Act
            const user = authService.extractUser(response);

            // Assert
            expect(user.apiKey).toBeUndefined();
        });

        it('should handle response without displayName', () => {
            // Arrange
            const response: AuthResponse = {
                userId: 'user-123',
                email: 'test@example.com',
                displayName: undefined as unknown as string,
                token: 'jwt-token-here',
                isNewUser: false,
            };

            // Act
            const user = authService.extractUser(response);

            // Assert
            expect(user.displayName).toBeUndefined();
        });
    });
});

