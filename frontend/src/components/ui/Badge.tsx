import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: [
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
          "hover:bg-[var(--primary)]/80",
        ],
        secondary: [
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
          "hover:bg-[var(--secondary)]/80",
        ],
        destructive: [
          "border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)]",
          "hover:bg-[var(--destructive)]/80",
        ],
        outline: ["text-[var(--text-primary)] border-[var(--border)]"],
        success: [
          "border-transparent bg-[var(--color-success-light)] text-[var(--color-success)]",
        ],
        warning: [
          "border-transparent bg-[var(--color-warning-light)] text-[var(--color-warning)]",
        ],
        notes: [
          "border-[var(--color-notes-border)] bg-[var(--color-notes-alpha)] text-[var(--color-notes-text)]",
        ],
        "web-search": [
          "border-[var(--color-accent-blue-border)] bg-[var(--color-accent-blue-alpha)] text-[var(--color-accent-blue-text)]",
        ],
        "image-gen": [
          "border-[var(--color-accent-purple-border)] bg-[var(--color-accent-purple-alpha)] text-[var(--color-accent-purple-text)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component for status indicators, tags, and labels.
 *
 * @example
 * <Badge>Default</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="notes">Notes</Badge>
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
