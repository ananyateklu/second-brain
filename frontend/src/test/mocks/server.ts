/**
 * MSW Server Configuration
 * Sets up the Mock Service Worker server for integration tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for intercepting API requests in tests.
 * Start this server in test setup and stop it in test teardown.
 */
export const server = setupServer(...handlers);

/**
 * Helper to reset handlers to the default handlers.
 * Useful for resetting state between tests.
 */
export function resetHandlers(): void {
  server.resetHandlers();
}

/**
 * Helper to add custom handlers for specific tests.
 * These handlers take precedence over the default handlers.
 */
export function useHandlers(...customHandlers: Parameters<typeof server.use>): void {
  server.use(...customHandlers);
}
