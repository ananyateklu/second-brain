import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[var(--foreground)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-primary)]",
        destructive:
          "border-[var(--color-error-border)] bg-[var(--color-error-light)] text-[var(--color-error-text)] [&>svg]:text-[var(--color-error)]",
        success:
          "border-[var(--color-success)] bg-[var(--color-success-light)] text-[var(--color-success)] [&>svg]:text-[var(--color-success)]",
        warning:
          "border-[var(--color-warning)] bg-[var(--color-warning-light)] text-[var(--color-warning)] [&>svg]:text-[var(--color-warning)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Alert container component.
 */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

/**
 * Alert title component.
 */
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

/**
 * Alert description component.
 */
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
