import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './native-notifications';

/**
 * Get the backend URL from Tauri
 * Falls back to default for web development
 */
export async function getBackendUrl(): Promise<string> {
  if (!isTauri()) {
    return '/api';
  }

  try {
    return await invoke<string>('get_backend_url');
  } catch {
    return 'http://localhost:5001/api';
  }
}

/**
 * Check if the backend is ready
 */
export async function isBackendReady(): Promise<boolean> {
  if (!isTauri()) {
    return true; // Assume ready in web mode
  }

  try {
    return await invoke<boolean>('is_backend_ready');
  } catch {
    return false;
  }
}

/**
 * Restart the backend process
 */
export async function restartBackend(): Promise<void> {
  if (!isTauri()) {
    console.warn('restartBackend is only available in Tauri');
    return;
  }

  await invoke('restart_backend');
}

/**
 * Open the data directory in Finder
 */
export async function openDataDirectory(): Promise<void> {
  if (!isTauri()) {
    console.warn('openDataDirectory is only available in Tauri');
    return;
  }

  await invoke('open_data_directory');
}

/**
 * Open the log directory in Finder
 */
export async function openLogDirectory(): Promise<void> {
  if (!isTauri()) {
    console.warn('openLogDirectory is only available in Tauri');
    return;
  }

  await invoke('open_log_directory');
}

/**
 * Get the app version
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) {
    return '2.0.0'; // Default for web
  }

  try {
    return await invoke<string>('get_app_version');
  } catch {
    return 'unknown';
  }
}

/**
 * Listen for backend events
 */
export async function onBackendEvent(
  event: 'backend-error' | 'backend-terminated',
  callback: (payload: unknown) => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen(event, (e) => callback(e.payload));
}

/**
 * Wait for backend to be ready
 */
export async function waitForBackend(maxWaitMs: number = 30000): Promise<boolean> {
  if (!isTauri()) {
    return true;
  }

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await isBackendReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * API secrets configuration for the desktop app
 */
export interface Secrets {
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
  gemini_api_key?: string | null;
  xai_api_key?: string | null;
  ollama_base_url?: string | null;
  pinecone_api_key?: string | null;
  pinecone_environment?: string | null;
  pinecone_index_name?: string | null;
}

/**
 * Get the current API secrets
 */
export async function getSecrets(): Promise<Secrets> {
  if (!isTauri()) {
    console.warn('getSecrets is only available in Tauri');
    return {};
  }

  try {
    return await invoke<Secrets>('get_secrets');
  } catch (e) {
    console.error('Failed to get secrets:', e);
    return {};
  }
}

/**
 * Save API secrets and optionally restart the backend
 */
export async function saveSecrets(secrets: Secrets, restart: boolean = true): Promise<void> {
  if (!isTauri()) {
    console.warn('saveSecrets is only available in Tauri');
    return;
  }

  await invoke('save_secrets_cmd', { secrets, restart });
}

/**
 * Get the path to the secrets file
 */
export async function getSecretsPath(): Promise<string> {
  if (!isTauri()) {
    return '';
  }

  try {
    return await invoke<string>('get_secrets_path');
  } catch {
    return '';
  }
}

/**
 * Listen for navigation events from the tray menu
 */
export async function onNavigateToSettings(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('navigate-to-settings', () => callback());
}

/**
 * Listen for About dialog event from app menu
 */
export async function onShowAboutDialog(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('show-about-dialog', () => callback());
}

/**
 * Listen for Create New Note event from app menu
 */
export async function onCreateNewNote(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('create-new-note', () => callback());
}

/**
 * Listen for Create New Chat event from app menu
 */
export async function onCreateNewChat(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('create-new-chat', () => callback());
}

/**
 * Listen for Open Documentation event from app menu
 */
export async function onOpenDocumentation(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('open-documentation', () => callback());
}

/**
 * Listen for Open Report Issue event from app menu
 */
export async function onOpenReportIssue(callback: () => void): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen('open-report-issue', () => callback());
}

/**
 * Listen for Tauri events with type-safe event names
 */
export type TauriEvent =
  | 'backend-error'
  | 'backend-terminated'
  | 'navigate-to-settings'
  | 'show-about-dialog'
  | 'create-new-note'
  | 'create-new-chat'
  | 'open-documentation'
  | 'open-report-issue';

export async function onTauriEvent<T = unknown>(
  event: TauriEvent,
  callback: (payload: T) => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => { };
  }

  return await listen(event, (e) => callback(e.payload as T));
}

