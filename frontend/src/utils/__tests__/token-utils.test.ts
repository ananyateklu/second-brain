/**
 * Token Utils Tests
 * Unit tests for token estimation utilities
 */

import { describe, it, expect } from 'vitest';
import { estimateTokenCount } from '../token-utils';

describe('token-utils', () => {
    // ============================================
    // estimateTokenCount Tests
    // ============================================
    describe('estimateTokenCount', () => {
        it('should return 0 for empty string', () => {
            // Act
            const result = estimateTokenCount('');

            // Assert
            expect(result).toBe(0);
        });

        it('should return 0 for null/undefined', () => {
            // Act & Assert
            expect(estimateTokenCount(null as unknown as string)).toBe(0);
            expect(estimateTokenCount(undefined as unknown as string)).toBe(0);
        });

        it('should estimate tokens based on character count', () => {
            // Arrange
            // 3.5 characters per token, so 7 characters = 2 tokens
            const text = 'hello!!'; // 7 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            expect(result).toBe(2); // 7 / 3.5 = 2
        });

        it('should round up to nearest token', () => {
            // Arrange
            const text = 'hi'; // 2 characters, 2 / 3.5 = 0.57, should round up to 1

            // Act
            const result = estimateTokenCount(text);

            // Assert
            expect(result).toBe(1);
        });

        it('should handle longer text', () => {
            // Arrange
            const text = 'The quick brown fox jumps over the lazy dog.'; // 44 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 44 / 3.5 = 12.57, ceil = 13
            expect(result).toBe(13);
        });

        it('should handle text with special characters', () => {
            // Arrange
            const text = '!!!@#$%^&*()'; // 12 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 12 / 3.5 = 3.43, ceil = 4
            expect(result).toBe(4);
        });

        it('should handle text with newlines', () => {
            // Arrange
            const text = 'line1\nline2\nline3'; // 17 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 17 / 3.5 = 4.86, ceil = 5
            expect(result).toBe(5);
        });

        it('should handle text with unicode characters', () => {
            // Arrange
            const text = '你好世界'; // 4 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 4 / 3.5 = 1.14, ceil = 2
            expect(result).toBe(2);
        });

        it('should handle single character', () => {
            // Arrange
            const text = 'a';

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 1 / 3.5 = 0.29, ceil = 1
            expect(result).toBe(1);
        });

        it('should handle whitespace-only string', () => {
            // Arrange
            const text = '   '; // 3 spaces

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 3 / 3.5 = 0.86, ceil = 1
            expect(result).toBe(1);
        });

        it('should handle very long text', () => {
            // Arrange
            const text = 'a'.repeat(1000); // 1000 characters

            // Act
            const result = estimateTokenCount(text);

            // Assert
            // 1000 / 3.5 = 285.71, ceil = 286
            expect(result).toBe(286);
        });
    });
});

