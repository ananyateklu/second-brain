/**
 * Store Registry
 * Provides lazy access to the store to break circular dependencies.
 * The bound-store registers itself here when it loads.
 */

import type { BoundStore } from './types';
import type { StoreApi, UseBoundStore } from 'zustand';

type BoundStoreType = UseBoundStore<StoreApi<BoundStore>>;

let _store: BoundStoreType | null = null;

/**
 * Register the store (called by bound-store.ts)
 */
export function registerStore(store: BoundStoreType): void {
  _store = store;
}

/**
 * Get the store (throws if not registered)
 */
export function getStore(): BoundStoreType {
  if (!_store) {
    throw new Error('Store not initialized. Make sure bound-store.ts is imported first.');
  }
  return _store;
}

/**
 * Check if store is registered
 */
export function isStoreRegistered(): boolean {
  return _store !== null;
}
