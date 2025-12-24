import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea component with support for labels, error states, and helper text.
 * Uses CSS classes for all states including focus, eliminating inline handlers.
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text displayed above the textarea */
  label?: string;
  /** Error message - triggers error styling when present */
  error?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, required, id, ...props }, ref) => {
    // Generate a stable ID if not provided
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold mb-2.5 text-[var(--text-primary)]"
          >
            {label}
            {required && <span className="text-[var(--color-error-text)] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            // Base styles
            "flex min-h-[80px] w-full rounded-xl border px-4 py-3 text-sm",
            "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
            "transition-all duration-200 resize-none",
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
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-[var(--color-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1.5 text-xs text-[var(--text-tertiary)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

