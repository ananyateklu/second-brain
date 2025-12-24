import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input component with support for labels, error states, and helper text.
 * Uses CSS classes for all states including focus, eliminating inline handlers.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message - triggers error styling when present */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, required, id, ...props }, ref) => {
    // Generate a stable ID if not provided
    const inputId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold mb-2.5 text-[var(--text-primary)]"
          >
            {label}
            {required && <span className="text-[var(--color-error-text)] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Base styles
            "flex h-11 w-full rounded-xl border px-4 py-3 text-sm",
            "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
            "transition-all duration-200",
            // Focus styles using CSS (no inline handlers)
            "focus:outline-none focus:ring-2",
            // Normal state
            !error && [
              "bg-[var(--surface-elevated)] border-[var(--border)]",
              "focus:border-[var(--input-focus-border)] focus:ring-[var(--input-focus-ring)]",
            ],
            // Error state
            error && [
              "bg-[var(--color-error-light)] border-[var(--color-error-border)]",
              "focus:border-[var(--color-error-text)] focus:ring-[color-mix(in_srgb,var(--color-error-text)_20%,transparent)]",
            ],
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-[var(--color-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-[var(--text-tertiary)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

