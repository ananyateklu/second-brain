import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Secrets } from '../../../lib/tauri-bridge';
import type { ApiKeyField } from './types';
import { ConfiguredBadge } from './ConfiguredBadge';
import { VisibilityToggle } from './VisibilityToggle';

interface ApiKeyInputProps {
  field: ApiKeyField;
  value: string | null | undefined;
  isVisible: boolean;
  onChange: (key: keyof Secrets, value: string) => void;
  onToggleVisibility: (key: keyof Secrets) => void;
}

/**
 * Single API key input field with label, visibility toggle, and help text.
 */
export function ApiKeyInput({
  field,
  value,
  isVisible,
  onChange,
  onToggleVisibility,
}: ApiKeyInputProps) {
  const hasValue = !!value;
  const isPasswordType = field.type === 'password';
  const [isFocused, setIsFocused] = useState(false);

  const maskValue = useCallback((val: string | null | undefined): string => {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••••••' + val.slice(-4);
  }, []);

  // Show actual value when focused or visible, otherwise show masked
  const displayValue =
    isFocused || isVisible || !isPasswordType ? value || '' : hasValue ? maskValue(value) : '';

  return (
    <div className="space-y-1">
      <label
        className="text-xs font-medium flex items-center gap-2 text-[var(--text-secondary)]"
      >
        {field.label}
        {hasValue && <ConfiguredBadge />}
      </label>
      <div className="relative">
        <input
          type={isPasswordType && !isVisible && !isFocused ? 'password' : 'text'}
          value={displayValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={cn(
            'w-full px-3 py-2.5 pr-10 rounded-xl text-sm transition-all',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
            'bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)]'
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPasswordType && (
          <VisibilityToggle
            isVisible={isVisible}
            onToggle={() => onToggleVisibility(field.key)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        )}
      </div>
      {field.helpText && (
        <p className="text-[11px] text-[var(--text-secondary)]">{field.helpText}</p>
      )}
    </div>
  );
}
