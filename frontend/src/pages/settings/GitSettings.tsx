/**
 * Git & GitHub Settings Page
 * Configuration for Git and GitHub integration
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '../../lib/native-notifications';
import { getSecrets, saveSecrets, type Secrets } from '../../lib/tauri-bridge';
import { toast } from '../../hooks/use-toast';
import {
  GitConfigSection,
  GitHubConfigSection,
  GitIntegrationStatus,
  GitHubIntegrationStatus,
  WebDisabledNotice,
} from './components/git';

// Git/GitHub specific secret keys
const GIT_GITHUB_KEYS: (keyof Secrets)[] = [
  'github_personal_access_token',
  'github_default_owner',
  'github_default_repo',
  'git_allowed_repository_roots',
  'git_require_user_scoped_root',
];

export function GitSettings() {
  const isTauriApp = isTauri();
  const [secrets, setSecrets] = useState<Secrets | null>(null);
  const [originalSecrets, setOriginalSecrets] = useState<Secrets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load secrets on mount
  useEffect(() => {
    if (isTauriApp) {
      void loadSecrets();
    } else {
      setIsLoading(false);
    }
  }, [isTauriApp]);

  const loadSecrets = async () => {
    try {
      setIsLoading(true);
      const loadedSecrets = await getSecrets();
      setSecrets(loadedSecrets);
      setOriginalSecrets(loadedSecrets);
    } catch (error) {
      toast.error('Failed to load settings', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (!secrets || !originalSecrets) return false;
    return GIT_GITHUB_KEYS.some((key) => {
      const newVal = secrets[key] ?? null;
      const origVal = originalSecrets[key] ?? null;
      return newVal !== origVal;
    });
  }, [secrets, originalSecrets]);

  // Handle secret value change
  const handleChange = useCallback((key: keyof Secrets, value: string | boolean | null) => {
    setSecrets((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  // Save secrets
  const handleSave = useCallback(async (restart = true) => {
    if (!secrets) return;
    try {
      setIsSaving(true);
      await saveSecrets(secrets, restart);
      setOriginalSecrets(secrets);
      toast.success(
        'Settings Saved',
        restart ? 'Backend is restarting to apply changes...' : 'Changes saved. Restart backend to apply.'
      );
    } catch (error) {
      toast.error('Failed to save settings', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [secrets]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        <div className="rounded-3xl border p-4 animate-pulse" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <div className="h-8 w-48 rounded-lg mb-4" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          <div className="h-10 w-full rounded-xl mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          <div className="h-10 w-full rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border p-4 animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
            <div className="h-6 w-24 rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }} />
          </div>
          <div className="rounded-2xl border p-4 animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
            <div className="h-6 w-24 rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* GitHub Configuration - Works in both modes */}
      <GitHubConfigSection
        isTauri={isTauriApp}
        secrets={secrets}
        onChange={handleChange}
        hasChanges={hasChanges()}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Git Configuration - Tauri Only */}
      {isTauriApp ? (
        <GitConfigSection
          secrets={secrets}
          onChange={handleChange}
          hasChanges={hasChanges()}
          onSave={handleSave}
          isSaving={isSaving}
        />
      ) : (
        <WebDisabledNotice
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
          title="Local Git Settings"
          description="Configure allowed repository paths and user scoping"
          reason="This feature requires access to your local filesystem and is only available in the desktop app."
        />
      )}

      {/* Status Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GitIntegrationStatus isTauri={isTauriApp} />
        <GitHubIntegrationStatus />
      </div>
    </div>
  );
}
