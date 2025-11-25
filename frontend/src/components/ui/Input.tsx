import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-semibold mb-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {label} {required && <span style={{ color: 'var(--color-error-text)' }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border px-4 py-3 focus:outline-none transition-all ${className}`}
          style={{
            color: 'var(--text-primary)',
            backgroundColor: error ? 'var(--color-error-light)' : 'var(--surface-elevated)',
            borderColor: error ? 'var(--color-error-border)' : 'var(--border)',
            boxShadow: 'none',
          }}
          onFocus={(e) => {
            if (error) {
              e.currentTarget.style.borderColor = 'var(--color-error-text)';
              e.currentTarget.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--color-error-text) 20%, transparent)`;
            } else {
              e.currentTarget.style.borderColor = 'var(--input-focus-border)';
              e.currentTarget.style.boxShadow = `0 0 0 2px var(--input-focus-ring)`;
            }
          }}
          onBlur={(e) => {
            if (error) {
              e.currentTarget.style.borderColor = 'var(--color-error-border)';
            } else {
              e.currentTarget.style.borderColor = 'var(--border)';
            }
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-sm" style={{ color: 'var(--color-error-text)' }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${props.id}-helper`}
            className="mt-1.5 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

