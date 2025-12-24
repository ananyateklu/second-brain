import { useState, useCallback, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Search, X } from 'lucide-react';

interface FileSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
}

export function FileSearchInput({
  value,
  onChange,
  placeholder = 'Search files...',
  resultCount,
  totalCount,
}: FileSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Debounce the onChange callback to prevent excessive re-renders
  const debouncedOnChange = useDebouncedCallback((newValue: string) => {
    onChange(newValue);
  }, 200);

  // Sync local value with external value when it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      debouncedOnChange(newValue);
    },
    [debouncedOnChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  const showResultCount = resultCount !== undefined && totalCount !== undefined && value.trim();

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
          style={{ color: isFocused ? 'var(--color-brand-500)' : 'var(--text-tertiary)' }}
        />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border transition-all duration-200 focus:outline-none"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: isFocused ? 'var(--input-focus-border)' : 'var(--border)',
            color: 'var(--text-primary)',
            boxShadow: isFocused ? '0 0 0 3px var(--input-focus-ring)' : 'none',
          }}
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-150 hover:text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showResultCount && (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {resultCount === 0 ? (
            'No files match your search'
          ) : (
            <>
              {resultCount} of {totalCount} files
            </>
          )}
        </div>
      )}
    </div>
  );
}
