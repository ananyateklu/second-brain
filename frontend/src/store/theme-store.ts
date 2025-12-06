/**
 * Theme Store
 * @deprecated Use useBoundStore from './bound-store' for new code.
 * This file maintains backward compatibility with existing imports.
 */

import type { BoundStore } from './types';
import type { StoreApi, UseBoundStore } from 'zustand';
import { getStore } from './store-registry';

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
      return Reflect.get(store, prop) as unknown;
    },
  };

  return new Proxy((() => { /* no-op */ }) as unknown as BoundStoreType, handler);
};

// Re-export the combined store as useThemeStore for backward compatibility
export const useThemeStore = createStoreProxy();
