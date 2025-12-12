import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface DropdownProps<T = string> {
  /** Current selected value */
  value: T;
  /** Available options */
  options: DropdownOption<T>[];
  /** Called when selection changes */
  onChange: (value: T) => void;
  /** Button label when no selection or custom label */
  label?: string;
  /** Show selected count badge */
  showCount?: boolean;
  /** Custom count to display */
  count?: number;
  /** Placeholder when no selection */
  placeholder?: string;
  /** Whether dropdown is disabled */
  disabled?: boolean;
  /** Custom class for the trigger button */
  className?: string;
  /** Alignment of dropdown menu */
  align?: 'left' | 'right';
  /** Width of dropdown menu */
  menuWidth?: 'auto' | 'full' | number;
}

/**
 * Reusable dropdown component with consistent styling
 *
 * @example
 * ```tsx
 * <Dropdown
 *   value={sortBy}
 *   options={[
 *     { value: 'newest', label: 'Newest first' },
 *     { value: 'oldest', label: 'Oldest first' },
 *   ]}
 *   onChange={setSortBy}
 *   label="Sort"
 * />
 * ```
 */
export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  label,
  showCount = false,
  count,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  align = 'left',
  menuWidth = 'auto',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = label || selectedOption?.label || placeholder;
  const displayCount = count ?? selectedOption?.count;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = useCallback((optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const menuStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-card)',
    borderColor: 'var(--border)',
    boxShadow: 'var(--shadow-xl)',
    ...(menuWidth === 'full' ? { width: '100%' } : {}),
    ...(typeof menuWidth === 'number' ? { width: `${menuWidth}px` } : {}),
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isOpen ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
          color: isOpen ? '#ffffff' : 'var(--text-primary)',
          border: `1px solid ${isOpen ? 'var(--color-brand-600)' : 'var(--border)'}`,
          boxShadow: isOpen ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
        <span>{displayLabel}</span>
        {showCount && displayCount !== undefined && displayCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: isOpen ? '#ffffff' : 'var(--color-brand-600)',
              color: isOpen ? 'var(--color-brand-600)' : '#ffffff',
            }}
          >
            {displayCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 min-w-[180px] rounded-xl border shadow-xl z-50 overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={menuStyle}
          role="listbox"
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className="w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
                      : 'transparent',
                    color: isSelected ? 'var(--color-brand-600)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !option.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                  <span className="flex-1">{option.label}</span>
                  {option.count !== undefined && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {option.count}
                    </span>
                  )}
                  {isSelected && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-select version of Dropdown
 */
export interface MultiSelectDropdownProps<T = string> {
  /** Current selected values */
  values: T[];
  /** Available options */
  options: DropdownOption<T>[];
  /** Called when selection changes */
  onChange: (values: T[]) => void;
  /** Button label */
  label: string;
  /** Placeholder when no selection */
  placeholder?: string;
  /** Whether dropdown is disabled */
  disabled?: boolean;
  /** Custom class for the trigger button */
  className?: string;
}

export function MultiSelectDropdown<T extends string | number>({
  values,
  options,
  onChange,
  label,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = useCallback((optionValue: T) => {
    const newValues = values.includes(optionValue)
      ? values.filter(v => v !== optionValue)
      : [...values, optionValue];
    onChange(newValues);
  }, [values, onChange]);

  const displayLabel = values.length > 0
    ? `${label} (${values.length})`
    : placeholder;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
        style={{
          backgroundColor: isOpen ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
          color: isOpen ? '#ffffff' : 'var(--text-primary)',
          border: `1px solid ${isOpen ? 'var(--color-brand-600)' : 'var(--border)'}`,
        }}
      >
        <span>{displayLabel}</span>
        {values.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: isOpen ? '#ffffff' : 'var(--color-brand-600)',
              color: isOpen ? 'var(--color-brand-600)' : '#ffffff',
            }}
          >
            {values.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 min-w-[200px] rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  disabled={option.disabled}
                  className="w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 flex items-center gap-2"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)'
                      : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-brand-600)' : 'transparent',
                      borderColor: isSelected ? 'var(--color-brand-600)' : 'var(--border)',
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {option.count !== undefined && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
