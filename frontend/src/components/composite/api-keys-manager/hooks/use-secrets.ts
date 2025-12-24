/**
 * Hook for managing secrets in Tauri app.
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '../../../../lib/native-notifications';
import { getSecrets, saveSecrets, getSecretsPath, type Secrets } from '../../../../lib/tauri-bridge';
import { toast } from '../../../../hooks/use-toast';
import { API_KEY_FIELDS } from '../constants';

interface UseSecretsOptions {
  onSaveSuccess?: () => void;
}

interface UseSecretsReturn {
  secrets: Secrets;
  originalSecrets: Secrets;
  secretsPath: string;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  visibleFields: Set<keyof Secrets>;
  handleChange: (key: keyof Secrets, value: string) => void;
  handleSave: (restart?: boolean) => Promise<void>;
  toggleVisibility: (key: keyof Secrets) => void;
  maskValue: (value: string | null | undefined) => string;
  reload: () => Promise<void>;
}

export function useSecrets(options: UseSecretsOptions = {}): UseSecretsReturn {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [originalSecrets, setOriginalSecrets] = useState<Secrets>({});
  const [secretsPath, setSecretsPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<keyof Secrets>>(new Set());

  const loadSecrets = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedSecrets, path] = await Promise.all([getSecrets(), getSecretsPath()]);
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
      void loadSecrets();
    }
  }, [loadSecrets]);

  const handleChange = useCallback(
    (key: keyof Secrets, value: string) => {
      const newSecrets = {
        ...secrets,
        [key]: value || null, // Convert empty string to null
      };
      setSecrets(newSecrets);

      // Check if there are actual changes from original
      const hasActualChanges = API_KEY_FIELDS.some((field) => {
        const newVal = newSecrets[field.key] || '';
        const origVal = originalSecrets[field.key] || '';
        return newVal !== origVal;
      });
      setHasChanges(hasActualChanges);
    },
    [secrets, originalSecrets]
  );

  const handleSave = useCallback(
    async (restart = true) => {
      try {
        setIsSaving(true);
        await saveSecrets(secrets, restart);
        setOriginalSecrets(secrets);
        setHasChanges(false);
        toast.success(
          'API Keys Saved',
          restart ? 'Backend is restarting to apply changes...' : 'Changes saved. Restart backend to apply.'
        );
        options.onSaveSuccess?.();
      } catch (error) {
        toast.error('Failed to save API keys', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsSaving(false);
      }
    },
    [secrets, options]
  );

  const toggleVisibility = useCallback((key: keyof Secrets) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const maskValue = useCallback((value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  }, []);

  return {
    secrets,
    originalSecrets,
    secretsPath,
    isLoading,
    isSaving,
    hasChanges,
    visibleFields,
    handleChange,
    handleSave,
    toggleVisibility,
    maskValue,
    reload: loadSecrets,
  };
}

// Simplified hook for single provider API key input
interface UseSingleSecretOptions {
  secretKey: string;
  onSaveSuccess?: () => void;
}

interface UseSingleSecretReturn {
  value: string | null | undefined;
  originalValue: string | null | undefined;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  isVisible: boolean;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  toggleVisibility: () => void;
  handleChange: (value: string) => void;
  handleSave: (restart?: boolean) => Promise<void>;
  maskValue: (value: string | null | undefined) => string;
}

export function useSingleSecret({ secretKey, onSaveSuccess }: UseSingleSecretOptions): UseSingleSecretReturn {
  const [secrets, setSecrets] = useState<Secrets>({});
  const [originalSecrets, setOriginalSecrets] = useState<Secrets>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
      void loadSecrets();
    }
  }, [loadSecrets]);

  const value = secrets[secretKey as keyof Secrets] as string | null | undefined;
  const originalValue = originalSecrets[secretKey as keyof Secrets] as string | null | undefined;
  const hasChanges = (value || '') !== (originalValue || '');

  const handleChange = useCallback(
    (newValue: string) => {
      setSecrets((prev) => ({
        ...prev,
        [secretKey]: newValue || null,
      }));
    },
    [secretKey]
  );

  const handleSave = useCallback(
    async (restart = true) => {
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
    },
    [secrets, onSaveSuccess]
  );

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const maskValue = useCallback((val: string | null | undefined): string => {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••••••' + val.slice(-4);
  }, []);

  return {
    value,
    originalValue,
    isLoading,
    isSaving,
    hasChanges,
    isVisible,
    isFocused,
    setIsFocused,
    toggleVisibility,
    handleChange,
    handleSave,
    maskValue,
  };
}
