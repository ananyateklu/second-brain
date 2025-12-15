/**
 * Store Registry Tests
 * Unit tests for the store registry utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to test the actual module, so we'll reset it between tests
describe('store-registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ============================================
  // registerStore Tests
  // ============================================
  describe('registerStore', () => {
    it('should register a store', async () => {
      const { registerStore, isStoreRegistered } = await import('../store-registry');
      const mockStore = vi.fn() as unknown as ReturnType<typeof import('../store-registry').getStore>;

      registerStore(mockStore);

      expect(isStoreRegistered()).toBe(true);
    });

    it('should allow overwriting store', async () => {
      const { registerStore, getStore } = await import('../store-registry');
      const mockStore1 = { getState: () => ({ a: 1 }) } as unknown as ReturnType<typeof getStore>;
      const mockStore2 = { getState: () => ({ a: 2 }) } as unknown as ReturnType<typeof getStore>;

      registerStore(mockStore1);
      registerStore(mockStore2);

      expect(getStore()).toBe(mockStore2);
    });
  });

  // ============================================
  // getStore Tests
  // ============================================
  describe('getStore', () => {
    it('should return registered store', async () => {
      const { registerStore, getStore } = await import('../store-registry');
      const mockStore = { getState: () => ({}) } as unknown as ReturnType<typeof getStore>;

      registerStore(mockStore);

      expect(getStore()).toBe(mockStore);
    });

    it('should throw error when store not registered', async () => {
      // Fresh import without registering
      const { getStore } = await import('../store-registry');

      expect(() => getStore()).toThrow('Store not initialized. Make sure bound-store.ts is imported first.');
    });
  });

  // ============================================
  // isStoreRegistered Tests
  // ============================================
  describe('isStoreRegistered', () => {
    it('should return false when store not registered', async () => {
      const { isStoreRegistered } = await import('../store-registry');

      expect(isStoreRegistered()).toBe(false);
    });

    it('should return true after store is registered', async () => {
      const { registerStore, isStoreRegistered } = await import('../store-registry');
      const mockStore = vi.fn() as unknown as ReturnType<typeof import('../store-registry').getStore>;

      expect(isStoreRegistered()).toBe(false);

      registerStore(mockStore);

      expect(isStoreRegistered()).toBe(true);
    });
  });
});
