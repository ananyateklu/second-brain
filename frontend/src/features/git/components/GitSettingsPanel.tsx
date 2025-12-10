/**
 * Git Settings Panel Component
 * Repository path configuration
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderGit, Check, Loader2, AlertCircle, Folder } from 'lucide-react';
import { useBoundStore } from '../../../store/bound-store';
import { useValidateRepository } from '../hooks';

interface GitSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitSettingsPanel = memo(function GitSettingsPanel({
  isOpen,
  onClose,
}: GitSettingsPanelProps) {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const setRepositoryPath = useBoundStore((state) => state.setRepositoryPath);

  const [inputPath, setInputPath] = useState(repositoryPath ?? '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateRepository = useValidateRepository(inputPath);

  useEffect(() => {
    setInputPath(repositoryPath ?? '');
  }, [repositoryPath, isOpen]);

  const handleValidateAndSave = useCallback(async () => {
    if (!inputPath.trim()) {
      setValidationError('Please enter a repository path');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await validateRepository.refetch();
      if (result.data) {
        setRepositoryPath(inputPath.trim());
        onClose();
      } else if (result.error) {
        const errorMessage =
          result.error instanceof Error
            ? result.error.message
            : 'The specified path is not a valid Git repository';
        setValidationError(errorMessage);
      } else {
        setValidationError('The specified path is not a valid Git repository');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to validate repository. Please check the path.';
      setValidationError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [inputPath, validateRepository, setRepositoryPath, onClose]);

  const handleClear = useCallback(() => {
    setRepositoryPath(null);
    setInputPath('');
    setValidationError(null);
  }, [setRepositoryPath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleValidateAndSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleValidateAndSave, onClose]
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
              <FolderGit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Git Settings
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Configure your repository
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
          {/* Path input */}
          <div>
            <label
              htmlFor="repo-path"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Repository Path
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Enter the absolute path to a local Git repository
            </p>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Folder className="w-4 h-4" />
              </div>
              <input
                id="repo-path"
                type="text"
                value={inputPath}
                onChange={(e) => {
                  setInputPath(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="/Users/username/projects/my-repo"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
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
            </div>

            {/* Validation error */}
            {validationError && (
              <div
                className="flex items-center gap-2 mt-3 p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-error-light)',
                  border: '1px solid var(--color-error-border)',
                }}
              >
                <AlertCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--color-error-text)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-error-text)' }}>
                  {validationError}
                </span>
              </div>
            )}
          </div>

          {/* Current repository display */}
          {repositoryPath && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-success-light)',
                border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                    Currently configured
                  </p>
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: 'color-mix(in srgb, var(--color-success) 80%, var(--text-primary))' }}
                  >
                    {repositoryPath}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={handleClear}
            disabled={!repositoryPath}
            className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: 'var(--color-error-text)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (repositoryPath) {
                e.currentTarget.style.backgroundColor = 'var(--color-error-light)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Clear
          </button>
          <div className="flex items-center gap-3">
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
              onClick={() => void handleValidateAndSave()}
              disabled={isValidating || !inputPath.trim()}
              className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
            >
              {/* Shimmer effect */}
              {!isValidating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  <span className="relative z-10">Validating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
