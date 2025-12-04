/**
 * TauriApiKeysManager Components
 * Manages API keys configuration for the Tauri desktop app
 * Only renders in Tauri mode
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '../../lib/native-notifications';
import { getSecrets, saveSecrets, getSecretsPath, type Secrets } from '../../lib/tauri-bridge';
import { toast } from '../../hooks/use-toast';

// Map provider IDs to their secret keys
const PROVIDER_SECRET_KEYS: Record<string, keyof Secrets> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  google: 'gemini_api_key',
  xai: 'xai_api_key',
  ollama: 'ollama_base_url',
};

const PROVIDER_KEY_INFO: Record<string, { label: string; placeholder: string; helpText?: string }> = {
  openai: { label: 'OpenAI API Key', placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
  google: { label: 'Google Gemini API Key', placeholder: 'AI...' },
  xai: { label: 'xAI (Grok) API Key', placeholder: 'xai-...' },
  ollama: { label: 'Ollama Base URL', placeholder: 'http://localhost:11434', helpText: 'Leave empty for default local Ollama' },
};

interface ApiKeyField {
  key: keyof Secrets;
  label: string;
  placeholder: string;
  type: 'password' | 'text';
  helpText?: string;
  group: 'ai' | 'vectorstore';
}

const API_KEY_FIELDS: ApiKeyField[] = [
  // AI Providers
  { key: 'openai_api_key', label: 'OpenAI API Key', placeholder: 'sk-...', type: 'password', group: 'ai' },
  { key: 'anthropic_api_key', label: 'Anthropic API Key', placeholder: 'sk-ant-...', type: 'password', group: 'ai' },
  { key: 'gemini_api_key', label: 'Google Gemini API Key', placeholder: 'AI...', type: 'password', group: 'ai' },
  { key: 'xai_api_key', label: 'xAI (Grok) API Key', placeholder: 'xai-...', type: 'password', group: 'ai' },
  { key: 'ollama_base_url', label: 'Ollama Base URL', placeholder: 'http://localhost:11434', type: 'text', group: 'ai', helpText: 'Leave empty for default local Ollama' },

  // Pinecone / Vector Store
  { key: 'pinecone_api_key', label: 'Pinecone API Key', placeholder: 'pcsk_...', type: 'password', group: 'vectorstore' },
  { key: 'pinecone_environment', label: 'Pinecone Environment', placeholder: 'us-east-1', type: 'text', group: 'vectorstore' },
  { key: 'pinecone_index_name', label: 'Pinecone Index Name', placeholder: 'second-brain', type: 'text', group: 'vectorstore' },
];

// Hook to load and manage secrets
export function useTauriSecrets() {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadSecrets = useCallback(async () => {
    if (!isTauri()) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const loadedSecrets = await getSecrets();
      setSecrets(loadedSecrets);
    } catch (error) {
      console.error('Failed to load secrets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const isProviderConfigured = useCallback((providerId: string): boolean => {
    const secretKey = PROVIDER_SECRET_KEYS[providerId];
    if (!secretKey) return true; // Unknown provider, assume configured
    const value = secrets[secretKey];
    // For Ollama, empty is OK (uses default local)
    if (providerId === 'ollama') return true;
    return !!value && value.trim() !== '';
  }, [secrets]);

  return { secrets, isLoading, isProviderConfigured, refetch: loadSecrets };
}

// Single provider API key input for the modal
interface TauriProviderApiKeyInputProps {
  providerId: string;
  onSaveSuccess?: () => void;
}

export function TauriProviderApiKeyInput({ providerId, onSaveSuccess }: TauriProviderApiKeyInputProps) {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [originalSecrets, setOriginalSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const secretKey = PROVIDER_SECRET_KEYS[providerId];
  const keyInfo = PROVIDER_KEY_INFO[providerId];
  const isPassword = providerId !== 'ollama';

  const loadSecrets = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedSecrets = await getSecrets();
      setSecrets(loadedSecrets);
      setOriginalSecrets(loadedSecrets);
    } catch (error) {
      toast.error('Failed to load API key', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTauri()) {
      loadSecrets();
    }
  }, [loadSecrets]);

  if (!isTauri() || !secretKey || !keyInfo) {
    return null;
  }

  const currentValue = secrets[secretKey] as string | null | undefined;
  const originalValue = originalSecrets[secretKey] as string | null | undefined;
  const hasChanges = (currentValue || '') !== (originalValue || '');
  const hasValue = !!currentValue;

  const maskValue = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  const handleChange = (value: string) => {
    setSecrets(prev => ({
      ...prev,
      [secretKey]: value || null,
    }));
  };

  const handleSave = async (restart: boolean = true) => {
    try {
      setIsSaving(true);
      await saveSecrets(secrets, restart);
      setOriginalSecrets(secrets);
      toast.success(
        'API Key Saved',
        restart ? 'Backend is restarting to apply changes...' : 'Changes saved. Restart backend to apply.'
      );
      onSaveSuccess?.();
    } catch (error) {
      toast.error('Failed to save API key', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = isFocused || isVisible || !isPassword
    ? (currentValue || '')
    : (hasValue ? maskValue(currentValue) : '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--color-brand-600)' }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          API Key Configuration
        </h4>
        {hasValue && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)',
              color: '#10b981',
            }}
          >
            Configured
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {keyInfo.label}
        </label>
        <div className="relative">
          <input
            type={isPassword && !isVisible && !isFocused ? 'password' : 'text'}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={keyInfo.placeholder}
            className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setIsVisible(!isVisible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ color: 'var(--text-secondary)' }}
              tabIndex={-1}
            >
              {isVisible ? (
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
          )}
        </div>
        {keyInfo.helpText && (
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{keyInfo.helpText}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={!hasChanges || isSaving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          Save Only
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={!hasChanges || isSaving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: hasChanges ? 'var(--color-brand-600)' : 'var(--surface-card)',
            color: hasChanges ? 'white' : 'var(--text-secondary)',
            border: '1px solid',
            borderColor: hasChanges ? 'var(--color-brand-600)' : 'var(--border)',
          }}
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : 'Save & Restart'}
        </button>
      </div>
    </div>
  );
}

// Full API Keys Manager (for a separate settings section if needed)
export function TauriApiKeysManager() {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [originalSecrets, setOriginalSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [secretsPath, setSecretsPath] = useState('');
  const [visibleFields, setVisibleFields] = useState<Set<keyof Secrets>>(new Set());

  const loadSecrets = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedSecrets, path] = await Promise.all([
        getSecrets(),
        getSecretsPath(),
      ]);
      setSecrets(loadedSecrets);
      setOriginalSecrets(loadedSecrets);
      setSecretsPath(path);
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to load API keys', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load secrets on mount
  useEffect(() => {
    if (isTauri()) {
      loadSecrets();
    }
  }, [loadSecrets]);

  // Don't render if not in Tauri
  if (!isTauri()) {
    return null;
  }

  const handleChange = (key: keyof Secrets, value: string) => {
    const newSecrets = {
      ...secrets,
      [key]: value || null, // Convert empty string to null
    };
    setSecrets(newSecrets);

    // Check if there are actual changes from original
    const hasActualChanges = API_KEY_FIELDS.some(field => {
      const newVal = newSecrets[field.key] || '';
      const origVal = originalSecrets[field.key] || '';
      return newVal !== origVal;
    });
    setHasChanges(hasActualChanges);
  };

  const handleSave = async (restart: boolean = true) => {
    try {
      setIsSaving(true);
      await saveSecrets(secrets, restart);
      setOriginalSecrets(secrets);
      setHasChanges(false);
      toast.success(
        'API Keys Saved',
        restart ? 'Backend is restarting to apply changes...' : 'Changes saved. Restart backend to apply.'
      );
    } catch (error) {
      toast.error('Failed to save API keys', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = (key: keyof Secrets) => {
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const maskValue = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-brand-600)' }} />
      </div>
    );
  }

  const aiProviderFields = API_KEY_FIELDS.filter(f => f.group === 'ai');
  const vectorStoreFields = API_KEY_FIELDS.filter(f => f.group === 'vectorstore');

  return (
    <div className="space-y-6">
      {/* AI Provider Keys */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Provider API Keys
        </h4>
        <div className="space-y-3">
          {aiProviderFields.map(field => (
            <ApiKeyInput
              key={field.key}
              field={field}
              value={secrets[field.key] as string | null | undefined}
              isVisible={visibleFields.has(field.key)}
              onChange={handleChange}
              onToggleVisibility={toggleVisibility}
              maskValue={maskValue}
            />
          ))}
        </div>
      </div>

      {/* Pinecone / Vector Store Keys */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Pinecone Vector Store
        </h4>
        <div className="space-y-3">
          {vectorStoreFields.map(field => (
            <ApiKeyInput
              key={field.key}
              field={field}
              value={secrets[field.key] as string | null | undefined}
              isVisible={visibleFields.has(field.key)}
              onChange={handleChange}
              onToggleVisibility={toggleVisibility}
              maskValue={maskValue}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {secretsPath && (
            <span>Stored in: <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>{secretsPath}</code></span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            Save Only
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: hasChanges ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
              color: hasChanges ? 'white' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: hasChanges ? 'var(--color-brand-600)' : 'var(--border)',
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
            ) : 'Save & Restart Backend'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual API key input
interface ApiKeyInputProps {
  field: ApiKeyField;
  value: string | null | undefined;
  isVisible: boolean;
  onChange: (key: keyof Secrets, value: string) => void;
  onToggleVisibility: (key: keyof Secrets) => void;
  maskValue: (value: string | null | undefined) => string;
}

function ApiKeyInput({ field, value, isVisible, onChange, onToggleVisibility, maskValue }: ApiKeyInputProps) {
  const hasValue = !!value;
  const isPasswordType = field.type === 'password';
  const [isFocused, setIsFocused] = useState(false);

  // Show actual value when focused or visible, otherwise show masked
  const displayValue = isFocused || isVisible || !isPasswordType
    ? (value || '')
    : (hasValue ? maskValue(value) : '');

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
        {field.label}
        {hasValue && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)',
              color: '#10b981',
            }}
          >
            Configured
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={isPasswordType && !isVisible && !isFocused ? 'password' : 'text'}
          value={displayValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => onToggleVisibility(field.key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-card)]"
            style={{ color: 'var(--text-secondary)' }}
            tabIndex={-1}
          >
            {isVisible ? (
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
        )}
      </div>
      {field.helpText && (
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{field.helpText}</p>
      )}
    </div>
  );
}
