/**
 * Store Index
 * Re-exports all Zustand stores and selectors
 */

// Auth store
export {
  useAuthStore,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectIsLoading,
  selectError,
  selectUserId,
  selectUserEmail,
  selectUserDisplayName,
  useUser,
  useIsAuthenticated,
  useUserId,
  useAuthLoading,
  useAuthError,
  useAuthActions,
} from './auth-store';

// Settings store
export {
  useSettingsStore,
  selectNoteView,
  selectItemsPerPage,
  selectFontSize,
  selectVectorStoreProvider,
  selectChatProvider,
  selectChatModel,
  selectOllamaRemoteUrl,
  selectUseRemoteOllama,
  selectNotificationsEnabled,
  useNoteView,
  useVectorStoreProvider,
  useChatPreferences,
  useOllamaSettings,
  useSettingsActions,
} from './settings-store';

// Theme store
export { useThemeStore } from './theme-store';

// UI store
export { useUIStore } from './ui-store';

// Ollama download store
export { useOllamaDownloadStore } from './ollama-download-store';

