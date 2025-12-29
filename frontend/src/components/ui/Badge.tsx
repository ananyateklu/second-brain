import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { badgeVariants } from "./badge.variants";

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

export { Badge };
