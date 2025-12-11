/**
 * Git Discard Dialog Component
 * Confirmation modal for discarding file changes
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useDiscardChanges } from '../hooks';
import type { GitFileChange } from '../../../types/git';

interface GitDiscardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: GitFileChange[];
  onSuccess?: () => void;
}

export const GitDiscardDialog = memo(function GitDiscardDialog({
  isOpen,
  onClose,
  files,
  onSuccess,
}: GitDiscardDialogProps) {
  const discardChanges = useDiscardChanges();

  const handleDiscard = useCallback(async () => {
    // Discard files sequentially
    for (const file of files) {
      await discardChanges.mutateAsync(file.filePath);
    }
    onSuccess?.();
    onClose();
  }, [files, discardChanges, onSuccess, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const isSingleFile = files.length === 1;
  const fileName = isSingleFile ? files[0].filePath.split('/').pop() : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
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
            background: 'radial-gradient(circle, var(--color-error), transparent)',
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
                background: 'linear-gradient(135deg, var(--color-error), var(--color-error-text))',
                boxShadow: '0 2px 8px var(--color-error-border)',
              }}
            >
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Discard Changes
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                This action cannot be undone
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
        <div className="p-6 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isSingleFile ? (
              <>
                Are you sure you want to discard all changes to{' '}
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fileName}
                </span>
                ?
              </>
            ) : (
              <>
                Are you sure you want to discard changes to{' '}
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {files.length} files
                </span>
                ?
              </>
            )}
          </p>

          {/* Warning box */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--color-error-light)',
              border: '1px solid var(--color-error-border)',
            }}
          >
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--color-error-text)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-error-text)' }}>
                Warning: Permanent loss
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'color-mix(in srgb, var(--color-error-text) 80%, var(--text-secondary))' }}
              >
                Your local changes will be permanently lost. The file{isSingleFile ? '' : 's'} will be restored to the last committed state.
              </p>
            </div>
          </div>

          {/* Files list (for multiple files) */}
          {!isSingleFile && files.length <= 10 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="max-h-32 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.filePath}
                    className="flex items-center gap-2 px-4 py-2"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <span
                      className="text-xs font-mono truncate flex-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {file.filePath}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            onClick={() => void handleDiscard()}
            disabled={discardChanges.isPending}
            className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'white',
              boxShadow: '0 2px 8px var(--color-error-border)',
            }}
          >
            {/* Shimmer effect */}
            {!discardChanges.isPending && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            {discardChanges.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                <span className="relative z-10">Discarding...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Discard Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
