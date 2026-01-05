/**
 * GitHub Configuration Section
 * Allows configuration of GitHub Personal Access Token and default repository
 */

import { useState } from 'react';
import type { Secrets } from '../../../../lib/tauri-bridge';
import { toast } from '../../../../hooks/use-toast';

interface GitHubConfigSectionProps {
  /** Whether running in Tauri desktop app */
  isTauri: boolean;
  /** Current secrets */
  secrets: Secrets | null;
  /** Handler for secret changes */
  onChange: (key: keyof Secrets, value: string | null) => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Handler to save changes */
  onSave: (restart?: boolean) => Promise<void>;
  /** Whether save is in progress */
  isSaving: boolean;
}

export function GitHubConfigSection({
  isTauri,
  secrets,
  onChange,
  hasChanges,
  onSave,
  isSaving,
}: GitHubConfigSectionProps) {
  const [showToken, setShowToken] = useState(false);

  const handleSave = async () => {
    try {
      await onSave(true);
      toast.success('GitHub Settings Saved', 'Your GitHub configuration has been updated. Backend restarted to apply changes.');
    } catch {
      toast.error('Save Failed', 'Failed to save GitHub settings. Please try again.');
    }
  };

  const maskValue = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
  };

  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-brand-600)' }}>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                Integration
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>|</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                GitHub Settings
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Connect to GitHub for pull requests, issues, and actions
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Personal Access Token */}
          <div>
            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Personal Access Token
            </label>
            {isTauri ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={showToken ? (secrets?.github_personal_access_token ?? '') : maskValue(secrets?.github_personal_access_token)}
                    onChange={(e) => onChange('github_personal_access_token', e.target.value || null)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-600)]"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showToken ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="px-3 py-2 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                Configure via environment variables or desktop app
              </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Required scopes: repo, workflow, read:org (for private repos)
            </p>
          </div>

          {/* Default Repository */}
          <div>
            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Default Repository
            </label>
            {isTauri ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={secrets?.github_default_owner ?? ''}
                  onChange={(e) => onChange('github_default_owner', e.target.value || null)}
                  placeholder="Owner (e.g., username)"
                  className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-600)]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <input
                  type="text"
                  value={secrets?.github_default_repo ?? ''}
                  onChange={(e) => onChange('github_default_repo', e.target.value || null)}
                  placeholder="Repository name"
                  className="px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-600)]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ) : (
              <div
                className="px-3 py-2 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                Configure via environment variables or desktop app
              </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Optional: Set a default repository for quicker access
            </p>
          </div>

          {/* Save Button (Tauri only) */}
          {isTauri && hasChanges && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                borderColor: 'var(--btn-primary-border)',
                color: 'var(--btn-primary-text)',
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {isSaving ? 'Saving...' : 'Save GitHub Settings'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
