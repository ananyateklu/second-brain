/**
 * TauriPineconeSetupModal Component
 * Modal for configuring Pinecone credentials in the Tauri desktop app
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from './Dialog';
import { LoadingSpinner } from './LoadingSpinner';
import { isTauri } from '../../lib/native-notifications';
import { getSecrets, saveSecrets, type Secrets } from '../../lib/tauri-bridge';
import { toast } from '../../hooks/use-toast';

interface TauriPineconeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export function TauriPineconeSetupModal({ isOpen, onClose, onSaveSuccess }: TauriPineconeSetupModalProps) {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const loadSecrets = useCallback(async () => {
    if (!isTauri()) return;
    try {
      setIsLoading(true);
      const loadedSecrets = await getSecrets();
      setSecrets(loadedSecrets);
    } catch (error) {
      toast.error('Failed to load Pinecone settings', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isTauri()) {
      void loadSecrets();
    }
  }, [isOpen, loadSecrets]);

  if (!isTauri()) {
    return null;
  }

  const handleChange = (key: keyof Secrets, value: string) => {
    setSecrets(prev => ({
      ...prev,
      [key]: value || null,
    }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!secrets.pinecone_api_key?.trim()) {
      toast.error('API Key Required', 'Please enter your Pinecone API key');
      return;
    }
    if (!secrets.pinecone_index_name?.trim()) {
      toast.error('Index Name Required', 'Please enter your Pinecone index name');
      return;
    }

    try {
      setIsSaving(true);
      await saveSecrets(secrets, true);
      toast.success(
        'Pinecone Configured',
        'Backend is restarting to apply changes...'
      );
      onSaveSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Failed to save Pinecone settings', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const maskValue = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  const isConfigured = !!(
    secrets.pinecone_api_key?.trim() &&
    secrets.pinecone_index_name?.trim()
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="rounded-t-3xl">
          <DialogTitle
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          >
            Setup Pinecone
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
      {isLoading ? (
        <LoadingSpinner message="Loading Pinecone settings..." />
      ) : (
        <div className="space-y-5">
          {/* Info Banner */}
          <div
            className="p-4 rounded-xl border flex gap-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 25%, transparent)',
            }}
          >
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Connect to Pinecone Vector Database
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Pinecone provides scalable vector storage for semantic search. Get your API key from{' '}
                <a
                  href="https://app.pinecone.io"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                  style={{ color: 'var(--color-brand-600)' }}
                >
                  app.pinecone.io
                </a>
              </p>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              Pinecone API Key
              <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                (required)
              </span>
            </label>
            <div className="relative">
              <input
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKeyVisible ? (secrets.pinecone_api_key || '') : (secrets.pinecone_api_key ? maskValue(secrets.pinecone_api_key) : '')}
                onChange={(e) => { handleChange('pinecone_api_key', e.target.value); }}
                onFocus={() => { setApiKeyVisible(true); }}
                onBlur={() => { setApiKeyVisible(false); }}
                placeholder="pcsk_..."
                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => { setApiKeyVisible(!apiKeyVisible); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-card)]"
                style={{ color: 'var(--text-secondary)' }}
                tabIndex={-1}
              >
                {apiKeyVisible ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Environment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              Environment
              <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={secrets.pinecone_environment || ''}
              onChange={(e) => { handleChange('pinecone_environment', e.target.value); }}
              placeholder="us-east-1 (leave empty for serverless)"
              className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              For serverless indexes, you can leave this empty
            </p>
          </div>

          {/* Index Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              Index Name
              <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                (required)
              </span>
            </label>
            <input
              type="text"
              value={secrets.pinecone_index_name || ''}
              onChange={(e) => { handleChange('pinecone_index_name', e.target.value); }}
              placeholder="second-brain"
              className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              The name of your Pinecone index (must match your index in Pinecone console)
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-brand-600)',
                color: 'white',
              }}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : isConfigured ? 'Update & Restart' : 'Save & Restart'}
            </button>
          </div>
        </div>
      )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

