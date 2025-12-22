/**
 * Test Utilities
 * Custom render function with providers and testing helpers
 */

 

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

/**
 * Props for the AllProviders wrapper
 */
interface AllProvidersProps {
    children: ReactNode;
    queryClient?: QueryClient;
}

/**
 * Wrapper component with all providers needed for testing
 */
function AllProviders({ children, queryClient }: AllProvidersProps): ReactElement {
    const client = queryClient ?? createTestQueryClient();

    return (
        <QueryClientProvider client={client}>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </QueryClientProvider>
    );
}

/**
 * Extended render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    queryClient?: QueryClient;
    route?: string;
}

/**
 * Custom render function that wraps components with providers
 */
function customRender(
    ui: ReactElement,
    options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
    const { queryClient = createTestQueryClient(), route = '/', ...renderOptions } = options;

    // Set initial route if specified
    if (route !== '/') {
        window.history.pushState({}, 'Test page', route);
    }

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <AllProviders queryClient={queryClient}>{children}</AllProviders>
    );

    const result = render(ui, { wrapper: Wrapper, ...renderOptions });

    return {
        ...result,
        queryClient,
    };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render method
export { customRender as render };

/**
 * Helper to create a mock note for testing
 */
export function createMockNote(overrides = {}) {
    return {
        id: 'test-note-id',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test-tag'],
        isArchived: false,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        ...overrides,
    };
}

/**
 * Helper to create a mock user for testing
 */
export function createMockUser(overrides = {}) {
    return {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        ...overrides,
    };
}

/**
 * Helper to create a mock auth response for testing
 */
export function createMockAuthResponse(overrides = {}) {
    return {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        token: 'test-jwt-token',
        ...overrides,
    };
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

