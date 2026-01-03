/**
 * Claude Session Card Component
 * Displays Claude Code session data with option to import as focus item
 */

import { memo, useCallback } from 'react';
import { Code2, RefreshCw, Plus, Clipboard, X, Clock, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { ClaudeSessionData } from '../types/claude-session';

export interface ClaudeSessionCardProps {
  /** Session data (null if not loaded) */
  session: ClaudeSessionData | null;
  /** Whether session is loading */
  isLoading: boolean;
  /** Whether running in Tauri mode (file access available) */
  isTauriMode: boolean;
  /** Called when "Import as Focus" is clicked */
  onImportAsFocus: (session: ClaudeSessionData) => void;
  /** Called to refresh session */
  onRefresh: () => void;
  /** Called when paste modal should open (web fallback) */
  onOpenPasteModal: () => void;
  /** Called to clear session */
  onClear: () => void;
  /** Whether import action is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card displaying Claude Code session data
 * In Tauri mode: Auto-reads session.md from project directory
 * In web mode: Shows button to paste session content
 */
export const ClaudeSessionCard = memo(function ClaudeSessionCard({
  session,
  isLoading,
  isTauriMode,
  onImportAsFocus,
  onRefresh,
  onOpenPasteModal,
  onClear,
  disabled = false,
  className,
}: ClaudeSessionCardProps) {
  const handleImport = useCallback(() => {
    if (session) {
      onImportAsFocus(session);
    }
  }, [session, onImportAsFocus]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-2xl border p-4 animate-pulse',
          className
        )}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-4 rounded w-1/3"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            />
            <div
              className="h-3 rounded w-1/2"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            />
          </div>
        </div>
        <div
          className="h-16 rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      </div>
    );
  }

  // No session loaded - show empty state with action
  if (!session) {
    return (
      <div
        className={cn(
          'rounded-2xl border p-4 transition-all duration-200',
          className
        )}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
            }}
          >
            <Code2
              className="h-4 w-4"
              style={{ color: 'var(--color-success)' }}
            />
          </span>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Claude Code Session
            </h3>
            <p
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {isTauriMode ? 'No active session found' : 'Paste your session.md content'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={isTauriMode ? onRefresh : onOpenPasteModal}
          className="w-full gap-2"
        >
          {isTauriMode ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Check for Session
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4" />
              Paste Session Content
            </>
          )}
        </Button>
      </div>
    );
  }

  // Session loaded - display content
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
            }}
          >
            <Code2
              className="h-4 w-4"
              style={{ color: 'var(--color-success)' }}
            />
          </span>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Claude Code Session
            </h3>
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {session.lastUpdated && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {session.lastUpdated}
                </span>
              )}
              {session.branch && (
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {session.branch}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-8 w-8"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Focus/Title */}
        {session.title && (
          <h4
            className="text-sm font-medium mb-2 line-clamp-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {session.title}
          </h4>
        )}

        {/* Description */}
        {session.description && (
          <p
            className="text-xs line-clamp-3 mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {session.description}
          </p>
        )}

        {/* Source badge + Import button */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor:
                session.source === 'file'
                  ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
              color:
                session.source === 'file'
                  ? 'var(--color-success)'
                  : 'var(--color-warning)',
            }}
          >
            {session.source === 'file' ? 'Auto-detected' : 'Pasted'}
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={disabled}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Import as Focus
          </Button>
        </div>
      </div>
    </div>
  );
});
