/**
 * Test Setup File
 * Configures testing environment with jest-dom matchers, MSW server, and global mocks
 */

import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test (important for test isolation)
afterEach(() => {
    cleanup();
    server.resetHandlers();
});

// Close MSW server after all tests
afterAll(() => {
    server.close();
});

// Mock window.matchMedia
beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // Mock ResizeObserver
    globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    })) as unknown as typeof ResizeObserver;

    // Mock IntersectionObserver
    globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: vi.fn(),
    })) as unknown as typeof IntersectionObserver;

    // Mock scrollTo
    window.scrollTo = vi.fn();

    // Mock localStorage
    const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
    });
});

// Reset all mocks after all tests
afterAll(() => {
    vi.restoreAllMocks();
});

