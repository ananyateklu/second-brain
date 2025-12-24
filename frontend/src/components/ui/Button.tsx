import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button variants using class-variance-authority (cva).
 * Uses CSS classes for all states including hover, eliminating the need
 * for inline onMouseEnter/onMouseLeave handlers.
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: [
          "border",
          "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)]",
          "shadow-[var(--btn-primary-shadow)]",
          "hover:bg-[var(--btn-primary-hover-bg)] hover:border-[var(--btn-primary-hover-border)] hover:shadow-[var(--btn-primary-hover-shadow)]",
          "active:scale-[0.98]",
        ],
        secondary: [
          "border",
          "bg-transparent text-[var(--btn-secondary-text)] border-[var(--btn-secondary-border)]",
          "shadow-[var(--btn-secondary-shadow)]",
          "hover:bg-[var(--btn-secondary-hover-bg)] hover:text-[var(--btn-secondary-hover-text)] hover:border-[var(--btn-secondary-hover-border)] hover:shadow-[var(--btn-secondary-hover-shadow)]",
          "active:scale-[0.98]",
        ],
        danger: [
          "border border-transparent",
          "bg-[var(--destructive)] text-[var(--destructive-foreground)]",
          "shadow-lg",
          "hover:bg-[var(--color-error-text)] hover:shadow-xl",
          "active:scale-[0.98]",
        ],
        ghost: [
          "bg-transparent text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
        ],
        outline: [
          "border",
          "bg-transparent text-[var(--text-primary)] border-[var(--border)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        ],
        link: [
          "text-[var(--link)] underline-offset-4",
          "hover:text-[var(--link-hover)] hover:underline",
        ],
      },
      size: {
        sm: "h-8 px-3 py-1.5 text-xs",
        md: "h-10 px-5 py-2.5 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a different element using Radix Slot */
  asChild?: boolean;
  /** Show loading spinner and disable button */
  isLoading?: boolean;
}

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * // Primary button (default)
 * <Button>Click me</Button>
 *
 * @example
 * // Secondary button with loading state
 * <Button variant="secondary" isLoading>Saving...</Button>
 *
 * @example
 * // Render as a link (using asChild)
 * <Button asChild variant="link">
 *   <a href="/docs">Documentation</a>
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };

