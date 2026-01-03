/**
 * Claude Code Session Types
 * Types for integrating Claude Code session.md data with the Focus UI
 */

/**
 * Parsed Claude Code session data extracted from session.md
 */
export interface ClaudeSessionData {
  /** Last updated timestamp from session.md header */
  lastUpdated: string | null;
  /** Current focus/work description from header */
  focus: string | null;
  /** Session title (from Current Work section or focus) */
  title: string | null;
  /** Session description (from Current Work section) */
  description: string | null;
  /** Git branch name if available */
  branch: string | null;
  /** Raw markdown content */
  rawContent: string;
  /** Source of the session data */
  source: 'file' | 'paste';
  /** Timestamp when this data was loaded */
  loadedAt: string;
}

/**
 * Result from attempting to read Claude session
 */
export interface ClaudeSessionResult {
  /** Whether the read was successful */
  success: boolean;
  /** Parsed session data (if successful) */
  data?: ClaudeSessionData;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Options for the useClaudeSession hook
 */
export interface UseClaudeSessionOptions {
  /** Project path for file reading (Tauri only) */
  projectPath?: string;
  /** Whether to enable auto-refresh polling */
  autoRefresh?: boolean;
  /** Custom refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
}

/**
 * Return type for the useClaudeSession hook
 */
export interface UseClaudeSessionReturn {
  /** Parsed session data (null if not loaded) */
  session: ClaudeSessionData | null;
  /** Whether session is currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Whether running in Tauri mode (file access available) */
  isTauriMode: boolean;
  /** Manually refresh session data */
  refresh: () => void;
  /** Set session from pasted content (web fallback) */
  setFromPaste: (content: string) => void;
  /** Clear the current session */
  clearSession: () => void;
}
