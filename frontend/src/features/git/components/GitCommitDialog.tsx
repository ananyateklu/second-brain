/**
 * Git Commit Dialog Component
 * Modal for creating commits with message input
 */

import { memo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, GitCommit, Loader2, FileCheck, Command } from 'lucide-react';
import { useCommit } from '../hooks';
import type { GitFileChange } from '../../../types/git';

interface GitCommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stagedFiles: GitFileChange[];
}

// Get status-specific styling using theme colors
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'M':
      return { color: 'var(--color-git-modified)', bgColor: 'var(--color-git-modified-bg)' };
    case 'A':
      return { color: 'var(--color-git-add)', bgColor: 'var(--color-git-add-line-bg)' };
    case 'D':
      return { color: 'var(--color-git-remove)', bgColor: 'var(--color-git-remove-line-bg)' };
    default:
      return { color: 'var(--text-tertiary)', bgColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)' };
  }
};

export const GitCommitDialog = memo(function GitCommitDialog({
  isOpen,
  onClose,
  stagedFiles,
}: GitCommitDialogProps) {
  const [message, setMessage] = useState('');
  const commit = useCommit();

  const handleCommit = useCallback(() => {
    if (!message.trim()) return;
    commit.mutate(message.trim(), {
      onSuccess: () => {
        setMessage('');
        onClose();
      },
    });
  }, [message, commit, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        handleCommit();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleCommit, onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-2xl), 0 0 60px -20px var(--color-primary-alpha)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Ambient glow effect */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--color-primary), transparent)',
          }}
        />
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
                boxShadow: '0 2px 8px var(--color-primary-alpha)',
              }}
            >
              <GitCommit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Create Commit
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} staged
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Staged files summary */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <FileCheck className="w-4 h-4" style={{ color: 'var(--color-brand-500)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Staged Changes
              </span>
            </div>
            {stagedFiles.length > 0 && (
              <div className="px-4 py-3 max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {stagedFiles.slice(0, 10).map((file) => {
                    const styles = getStatusStyles(file.status);
                    const fileName = file.filePath.split('/').pop() ?? file.filePath;
                    return (
                      <div
                        key={file.filePath}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: styles.bgColor,
                            color: styles.color,
                          }}
                        >
                          {file.status}
                        </span>
                        <span
                          className="text-xs truncate flex-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {fileName}
                        </span>
                      </div>
                    );
                  })}
                  {stagedFiles.length > 10 && (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      +{stagedFiles.length - 10} more files
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Commit message input */}
          <div>
            <label
              htmlFor="commit-message"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Commit Message
            </label>
            <textarea
              id="commit-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a descriptive commit message..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all duration-200 focus:outline-none"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-brand-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoFocus
            />
            <div
              className="flex items-center gap-1.5 mt-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Command className="w-3 h-3" />
              <span className="text-xs">+</span>
              <span className="text-xs">Enter to commit</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={!message.trim() || stagedFiles.length === 0 || commit.isPending}
            className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              boxShadow: 'var(--btn-primary-shadow)',
            }}
          >
            {/* Shimmer effect */}
            {!commit.isPending && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            {commit.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                <span className="relative z-10">Committing...</span>
              </>
            ) : (
              <>
                <GitCommit className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Commit Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
