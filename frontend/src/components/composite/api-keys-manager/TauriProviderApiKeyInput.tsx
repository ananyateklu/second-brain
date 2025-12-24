import { cn } from '@/lib/utils';
import { isTauri } from '../../../lib/native-notifications';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { PROVIDER_SECRET_KEYS, PROVIDER_KEY_INFO } from './constants';
import { ConfiguredBadge } from './ConfiguredBadge';
import { VisibilityToggle } from './VisibilityToggle';
import { SaveButtons } from './SaveButtons';
import { useSingleSecret } from './hooks/use-secrets';
import type { TauriProviderApiKeyInputProps } from './types';

/**
 * Single provider API key input for modal dialogs.
 */
export function TauriProviderApiKeyInput({ providerId, onSaveSuccess }: TauriProviderApiKeyInputProps) {
  const secretKey = PROVIDER_SECRET_KEYS[providerId];
  const keyInfo = PROVIDER_KEY_INFO[providerId];
  const isPassword = providerId !== 'ollama';

  const {
    value,
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
  } = useSingleSecret({
    secretKey,
    onSaveSuccess,
  });

  if (!isTauri() || !secretKey || !keyInfo) {
    return null;
  }

  const hasValue = !!value;

  const displayValue =
    isFocused || isVisible || !isPassword ? value || '' : hasValue ? maskValue(value) : '';

  if (isLoading) {
    return <LoadingSpinner size="xs" inline />;
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
        <svg
          className="h-4 w-4 text-[var(--color-brand-600)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
          />
        </svg>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          API Key Configuration
        </h4>
        {hasValue && <ConfiguredBadge />}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {keyInfo.label}
        </label>
        <div className="relative">
          <input
            type={isPassword && !isVisible && !isFocused ? 'password' : 'text'}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={keyInfo.placeholder}
            className={cn(
              'w-full px-3 py-2.5 pr-10 rounded-xl text-sm transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
              'bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text-primary)]'
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {isPassword && (
            <VisibilityToggle
              isVisible={isVisible}
              onToggle={toggleVisibility}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
        {keyInfo.helpText && (
          <p className="text-[11px] text-[var(--text-secondary)]">{keyInfo.helpText}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <SaveButtons
          hasChanges={hasChanges}
          isSaving={isSaving}
          onSave={handleSave}
          variant="compact"
        />
      </div>
    </div>
  );
}
