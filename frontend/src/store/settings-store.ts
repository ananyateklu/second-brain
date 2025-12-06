/**
 * Settings Store
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

// Re-export the combined store as useSettingsStore for backward compatibility
export const useSettingsStore = createStoreProxy();

// ============================================
// Selectors (backward compatible)
// ============================================

export const selectNoteView = (state: BoundStore) => state.defaultNoteView;
export const selectItemsPerPage = (state: BoundStore) => state.itemsPerPage;
export const selectFontSize = (state: BoundStore) => state.fontSize;
export const selectVectorStoreProvider = (state: BoundStore) => state.vectorStoreProvider;
export const selectChatProvider = (state: BoundStore) => state.chatProvider;
export const selectChatModel = (state: BoundStore) => state.chatModel;
export const selectOllamaRemoteUrl = (state: BoundStore) => state.ollamaRemoteUrl;
export const selectUseRemoteOllama = (state: BoundStore) => state.useRemoteOllama;
export const selectNotificationsEnabled = (state: BoundStore) => state.enableNotifications;

// ============================================
// Selector Hooks (backward compatible)
// ============================================

export const useNoteView = () => useSettingsStore(selectNoteView);
export const useVectorStoreProvider = () => useSettingsStore(selectVectorStoreProvider);

export const useChatPreferences = () =>
  useSettingsStore((state) => ({
    provider: state.chatProvider,
    model: state.chatModel,
  }));

export const useOllamaSettings = () =>
  useSettingsStore((state) => ({
    remoteUrl: state.ollamaRemoteUrl,
    useRemote: state.useRemoteOllama,
  }));

export const useSettingsActions = () =>
  useSettingsStore((state) => ({
    setDefaultNoteView: state.setDefaultNoteView,
    setItemsPerPage: state.setItemsPerPage,
    setFontSize: state.setFontSize,
    setVectorStoreProvider: state.setVectorStoreProvider,
    setChatProvider: state.setChatProvider,
    setChatModel: state.setChatModel,
    setOllamaRemoteUrl: state.setOllamaRemoteUrl,
    setUseRemoteOllama: state.setUseRemoteOllama,
    resetSettings: state.resetSettings,
  }));
