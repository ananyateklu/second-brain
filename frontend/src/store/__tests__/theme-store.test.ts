/**
 * Theme Store Tests
 * Unit tests for theme state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useThemeStore } from '../theme-store';

// Mock resetThemeColorCache
vi.mock('../../utils/theme-colors', () => ({
    resetThemeColorCache: vi.fn(),
}));

describe('theme-store', () => {
    beforeEach(() => {
        // Reset the store before each test
        useThemeStore.setState({ theme: 'light' });
        vi.clearAllMocks();

        // Mock document methods
        vi.spyOn(document.documentElement, 'setAttribute').mockImplementation(() => { });
        vi.spyOn(document.documentElement.classList, 'add').mockImplementation(() => { });
        vi.spyOn(document.documentElement.classList, 'remove').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // Initial State Tests
    // ============================================
    describe('initial state', () => {
        it('should have light theme as default', () => {
            // Act
            const state = useThemeStore.getState();

            // Assert
            expect(state.theme).toBe('light');
        });
    });

    // ============================================
    // setTheme Tests
    // ============================================
    describe('setTheme', () => {
        it('should set theme to dark', () => {
            // Act
            useThemeStore.getState().setTheme('dark');

            // Assert
            expect(useThemeStore.getState().theme).toBe('dark');
        });

        it('should set theme to blue', () => {
            // Act
            useThemeStore.getState().setTheme('blue');

            // Assert
            expect(useThemeStore.getState().theme).toBe('blue');
        });

        it('should set theme to light', () => {
            // Arrange - start with dark theme
            useThemeStore.setState({ theme: 'dark' });

            // Act
            useThemeStore.getState().setTheme('light');

            // Assert
            expect(useThemeStore.getState().theme).toBe('light');
        });

        it('should set data-theme attribute on document element', () => {
            // Act
            useThemeStore.getState().setTheme('dark');

            // Assert
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        it('should add dark class for dark theme', () => {
            // Act
            useThemeStore.getState().setTheme('dark');

            // Assert
            expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
        });

        it('should add dark class for blue theme', () => {
            // Act
            useThemeStore.getState().setTheme('blue');

            // Assert
            expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
        });

        it('should remove dark class for light theme', () => {
            // Act
            useThemeStore.getState().setTheme('light');

            // Assert
            expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
        });
    });

    // ============================================
    // toggleTheme Tests
    // ============================================
    describe('toggleTheme', () => {
        it('should toggle from light to dark', () => {
            // Arrange
            useThemeStore.setState({ theme: 'light' });

            // Act
            useThemeStore.getState().toggleTheme();

            // Assert
            expect(useThemeStore.getState().theme).toBe('dark');
        });

        it('should toggle from dark to blue', () => {
            // Arrange
            useThemeStore.setState({ theme: 'dark' });

            // Act
            useThemeStore.getState().toggleTheme();

            // Assert
            expect(useThemeStore.getState().theme).toBe('blue');
        });

        it('should toggle from blue to light', () => {
            // Arrange
            useThemeStore.setState({ theme: 'blue' });

            // Act
            useThemeStore.getState().toggleTheme();

            // Assert
            expect(useThemeStore.getState().theme).toBe('light');
        });

        it('should complete full theme cycle', () => {
            // Arrange
            useThemeStore.setState({ theme: 'light' });

            // Act & Assert - full cycle: light -> dark -> blue -> light
            useThemeStore.getState().toggleTheme();
            expect(useThemeStore.getState().theme).toBe('dark');

            useThemeStore.getState().toggleTheme();
            expect(useThemeStore.getState().theme).toBe('blue');

            useThemeStore.getState().toggleTheme();
            expect(useThemeStore.getState().theme).toBe('light');
        });
    });

    // ============================================
    // Theme Persistence Tests
    // ============================================
    describe('theme persistence', () => {
        it('should set data-theme attribute when toggling', () => {
            // Arrange
            useThemeStore.setState({ theme: 'light' });

            // Act
            useThemeStore.getState().toggleTheme();

            // Assert
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });
    });

    // ============================================
    // Theme Values Tests
    // ============================================
    describe('theme values', () => {
        it('should only accept valid theme values', () => {
            // Test that the store only accepts valid theme types
            const validThemes = ['light', 'dark', 'blue'];

            validThemes.forEach((theme) => {
                useThemeStore.getState().setTheme(theme as 'light' | 'dark' | 'blue');
                expect(useThemeStore.getState().theme).toBe(theme);
            });
        });
    });
});

