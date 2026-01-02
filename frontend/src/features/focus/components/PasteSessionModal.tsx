/**
 * Paste Session Modal Component
 * Modal for pasting Claude Code session.md content (web fallback)
 */

import { memo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Clipboard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isValidSessionContent } from '../utils/parse-claude-session';

export interface PasteSessionModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Called with pasted content when submitted */
  onPaste: (content: string) => void;
}

/**
 * Modal for pasting session.md content
 * Used as fallback when not running in Tauri (no file access)
 */
export const PasteSessionModal = memo(function PasteSessionModal({
  isOpen,
  onClose,
  onPaste,
}: PasteSessionModalProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!content.trim()) {
      setError('Please paste your session.md content');
      return;
    }

    if (!isValidSessionContent(content)) {
      setError("This doesn't look like a valid session.md file. Expected markers like '# Current Session Context' or '**Focus**:'");
      return;
    }

    onPaste(content);
    setContent('');
    setError(null);
    onClose();
  }, [content, onPaste, onClose]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(text);
      setError(null);
    } catch {
      setError('Failed to read clipboard. Please paste manually using Ctrl+V / Cmd+V.');
    }
  }, []);

  const handleClose = useCallback(() => {
    setContent('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - fixed fullscreen with high z-index */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
      >
        <div
          className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <FileText
              className="h-5 w-5"
              style={{ color: 'var(--color-success)' }}
            />
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Paste Session Content
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Copy the contents of your{' '}
            <code
              className="text-xs px-1 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              .claude/session.md
            </code>{' '}
            file and paste below.
          </p>

          <div className="space-y-2">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handlePasteFromClipboard()}
                className="gap-1.5"
              >
                <Clipboard className="h-4 w-4" />
                Paste from Clipboard
              </Button>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError(null);
              }}
              placeholder={`# Current Session Context\n> **Last Updated**: ...\n> **Focus**: ...`}
              rows={10}
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: error ? 'var(--color-error)' : 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            {error && (
              <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 p-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Load Session
          </Button>
        </div>
        </div>
      </div>
    </>,
    document.body
  );
});
