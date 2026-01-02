/**
 * Git Configuration Section (Desktop Only)
 * Allows configuration of allowed repository roots and user scoping
 */

import { useState, useCallback } from 'react';
import type { Secrets } from '../../../../lib/tauri-bridge';
import { toast } from '../../../../hooks/use-toast';

/** Parse git_allowed_repository_roots into array */
function parseAllowedRoots(value: string | null | undefined): string[] {
  return value ? value.split(',').map((p) => p.trim()).filter(Boolean) : [];
}

interface GitConfigSectionProps {
  /** Current secrets */
  secrets: Secrets | null;
  /** Handler for secret changes */
  onChange: (key: keyof Secrets, value: string | boolean | null) => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Handler to save changes */
  onSave: (restart?: boolean) => Promise<void>;
  /** Whether save is in progress */
  isSaving: boolean;
}

export function GitConfigSection({
  secrets,
  onChange,
  hasChanges,
  onSave,
  isSaving,
}: GitConfigSectionProps) {
  const [newPath, setNewPath] = useState('');

  // Parse comma-separated paths into array
  const allowedRoots = parseAllowedRoots(secrets?.git_allowed_repository_roots);
  const requireUserScoped = secrets?.git_require_user_scoped_root ?? true;

  const handleAddPath = useCallback(() => {
    if (!newPath.trim()) return;
    const currentRoots = parseAllowedRoots(secrets?.git_allowed_repository_roots);
    const updatedRoots = [...currentRoots, newPath.trim()];
    onChange('git_allowed_repository_roots', updatedRoots.join(','));
    setNewPath('');
  }, [newPath, secrets?.git_allowed_repository_roots, onChange]);

  const handleRemovePath = useCallback((index: number) => {
    const currentRoots = parseAllowedRoots(secrets?.git_allowed_repository_roots);
    const updatedRoots = currentRoots.filter((_, i) => i !== index);
    onChange('git_allowed_repository_roots', updatedRoots.length > 0 ? updatedRoots.join(',') : null);
  }, [secrets?.git_allowed_repository_roots, onChange]);

  const handleToggleUserScoped = useCallback(() => {
    onChange('git_require_user_scoped_root', !requireUserScoped);
  }, [requireUserScoped, onChange]);

  const handleSave = async () => {
    try {
      await onSave(true);
      toast.success('Git Settings Saved', 'Your Git configuration has been updated. Backend restarted to apply changes.');
    } catch {
      toast.error('Save Failed', 'Failed to save Git settings. Please try again.');
    }
  };

  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                Desktop Only
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>|</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Local Git Settings
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Configure allowed repository paths for Git integration
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Allowed Repository Roots */}
          <div>
            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Allowed Repository Roots
            </label>

            {/* Existing paths */}
            <div className="space-y-2 mb-2">
              {allowedRoots.length === 0 ? (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  No repository roots configured. Add paths below.
                </p>
              ) : (
                allowedRoots.map((path, index) => (
                  <div
                    key={`${path}-${index}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'var(--surface-elevated)' }}
                  >
                    <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                      {path}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePath(index)}
                      className="text-xs p-1 rounded-lg hover:bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)] transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new path */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPath()}
                placeholder="/path/to/repositories"
                className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-600)]"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleAddPath}
                disabled={!newPath.trim()}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  borderColor: 'var(--btn-primary-border)',
                  color: 'var(--btn-primary-text)',
                  boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
                }}
              >
                Add
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Absolute paths to directories where Git repositories are allowed
            </p>
          </div>

          {/* User Scoped Root Toggle */}
          <div>
            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              User Isolation
            </label>
            <button
              type="button"
              onClick={handleToggleUserScoped}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: requireUserScoped
                  ? 'color-mix(in srgb, var(--color-brand-600) 10%, var(--surface-elevated))'
                  : 'var(--surface-elevated)',
                borderColor: requireUserScoped ? 'var(--color-brand-600)' : 'var(--border)',
              }}
            >
              <div
                className="relative w-10 h-5 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: requireUserScoped
                    ? 'var(--btn-primary-bg)'
                    : 'color-mix(in srgb, var(--text-secondary) 30%, transparent)',
                }}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: requireUserScoped ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium block" style={{ color: 'var(--text-primary)' }}>
                  Require User-Scoped Root
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Isolate repository access per user ID
                </span>
              </div>
            </button>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                borderColor: 'var(--btn-primary-border)',
                color: 'var(--btn-primary-text)',
                boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {isSaving ? 'Saving...' : 'Save Git Settings'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
