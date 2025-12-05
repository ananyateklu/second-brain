/**
 * Authentication Store
 * @deprecated Use useBoundStore from './bound-store' for new code.
 * This file maintains backward compatibility with existing imports.
 */

import type { BoundStore } from './types';
import type { StoreApi, UseBoundStore } from 'zustand';
import { getStore } from './store-registry';

type BoundStoreType = UseBoundStore<StoreApi<BoundStore>>;

// Create a callable proxy that forwards to the real store
// The target must be a function for the `apply` trap to work
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

  // Use a dummy function as target so `apply` trap works
  return new Proxy((() => { }) as unknown as BoundStoreType, handler);
};

// Re-export the combined store as useAuthStore for backward compatibility
export const useAuthStore = createStoreProxy();

// ============================================
// Selectors (backward compatible)
// ============================================

export const selectUser = (state: BoundStore) => state.user;
export const selectToken = (state: BoundStore) => state.token;
export const selectIsAuthenticated = (state: BoundStore) => state.isAuthenticated;
export const selectIsLoading = (state: BoundStore) => state.isLoading;
export const selectError = (state: BoundStore) => state.error;
export const selectUserId = (state: BoundStore) => state.user?.userId ?? null;
export const selectUserEmail = (state: BoundStore) => state.user?.email ?? null;
export const selectUserDisplayName = (state: BoundStore) => state.user?.displayName ?? null;

// ============================================
// Selector Hooks (backward compatible)
// ============================================

export const useUser = () => useAuthStore(selectUser);
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);
export const useUserId = () => useAuthStore(selectUserId);
export const useAuthLoading = () => useAuthStore(selectIsLoading);
export const useAuthError = () => useAuthStore(selectError);

export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    register: state.register,
    signOut: state.signOut,
    clearError: state.clearError,
  }));
