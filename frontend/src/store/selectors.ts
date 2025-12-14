/**
 * Centralized Store Selectors
 * Provides optimized selectors for all store slices
 */

import type { BoundStore } from './types';

// ============================================
// Auth Selectors
// ============================================

export const selectUser = (state: BoundStore) => state.user;
export const selectToken = (state: BoundStore) => state.token;
export const selectIsAuthenticated = (state: BoundStore) => state.isAuthenticated;
export const selectIsLoading = (state: BoundStore) => state.isLoading;
export const selectAuthError = (state: BoundStore) => state.error;
export const selectUserId = (state: BoundStore) => state.user?.userId ?? null;
export const selectUserEmail = (state: BoundStore) => state.user?.email ?? null;
export const selectUserDisplayName = (state: BoundStore) => state.user?.displayName ?? null;

export const selectAuthActions = (state: BoundStore) => ({
  login: state.login,
  register: state.register,
  signOut: state.signOut,
  clearError: state.clearError,
});

// ============================================
// Settings Selectors
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

export const selectChatPreferences = (state: BoundStore) => ({
  provider: state.chatProvider,
  model: state.chatModel,
});

export const selectOllamaSettings = (state: BoundStore) => ({
  remoteUrl: state.ollamaRemoteUrl,
  useRemote: state.useRemoteOllama,
});

export const selectSettingsActions = (state: BoundStore) => ({
  setDefaultNoteView: state.setDefaultNoteView,
  setItemsPerPage: state.setItemsPerPage,
  setFontSize: state.setFontSize,
  setVectorStoreProvider: state.setVectorStoreProvider,
  setChatProvider: state.setChatProvider,
  setChatModel: state.setChatModel,
  setOllamaRemoteUrl: state.setOllamaRemoteUrl,
  setUseRemoteOllama: state.setUseRemoteOllama,
  resetSettings: state.resetSettings,
});

// ============================================
// UI Selectors
// ============================================

export const selectIsCreateModalOpen = (state: BoundStore) => state.isCreateModalOpen;
export const selectIsEditModalOpen = (state: BoundStore) => state.isEditModalOpen;
export const selectEditingNoteId = (state: BoundStore) => state.editingNoteId;
export const selectIsMobileMenuOpen = (state: BoundStore) => state.isMobileMenuOpen;
export const selectIsSearchOpen = (state: BoundStore) => state.isSearchOpen;
export const selectSearchQuery = (state: BoundStore) => state.searchQuery;
export const selectSearchMode = (state: BoundStore) => state.searchMode;
export const selectSidebarState = (state: BoundStore) => state.sidebarState;
export const selectNotesViewMode = (state: BoundStore) => state.notesViewMode;

export const selectUIActions = (state: BoundStore) => ({
  openCreateModal: state.openCreateModal,
  closeCreateModal: state.closeCreateModal,
  openEditModal: state.openEditModal,
  closeEditModal: state.closeEditModal,
  toggleSidebar: state.toggleSidebar,
  closeSidebar: state.closeSidebar,
  setSearchQuery: state.setSearchQuery,
  setNotesViewMode: state.setNotesViewMode,
});

// ============================================
// Theme Selectors
// ============================================

export const selectTheme = (state: BoundStore) => state.theme;

export const selectThemeActions = (state: BoundStore) => ({
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
});

// ============================================
// Ollama Download Selectors
// ============================================

export const selectDownloads = (state: BoundStore) => state.downloads;
export const selectDownload = (modelName: string) => (state: BoundStore) =>
  state.downloads[modelName];
export const selectActiveDownloads = (state: BoundStore) =>
  Object.values(state.downloads).filter(
    (d) => d.status === 'downloading' || d.status === 'pending'
  );

export const selectOllamaDownloadActions = (state: BoundStore) => ({
  startDownload: state.startDownload,
  cancelDownload: state.cancelDownload,
  clearDownload: state.clearDownload,
  clearCompletedDownloads: state.clearCompletedDownloads,
});
