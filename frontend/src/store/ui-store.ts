/**
 * UI Store
 * @deprecated Use useBoundStore from './bound-store' for new code.
 * This file maintains backward compatibility with existing imports.
 */

import type { BoundStore } from './types';
import type { StoreApi, UseBoundStore } from 'zustand';
import { getStore } from './store-registry';

// Re-export types for backward compatibility
export type { NotesViewMode } from './types';

type BoundStoreType = UseBoundStore<StoreApi<BoundStore>>;

// Create a callable proxy that forwards to the real store
const createStoreProxy = (): BoundStoreType => {
  const handler: ProxyHandler<BoundStoreType> = {
    apply(_target, _thisArg, args: [((state: BoundStore) => unknown)?]) {
      const store = getStore();
      return args[0] ? store(args[0]) : store();
    },
    get(_target, prop: string | symbol) {
      const store = getStore();
      return Reflect.get(store, prop);
    },
  };

  return new Proxy((() => {}) as unknown as BoundStoreType, handler);
};

// Re-export the combined store as useUIStore for backward compatibility
export const useUIStore = createStoreProxy();
