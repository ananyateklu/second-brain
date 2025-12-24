import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show shimmer animation */
  animate?: boolean;
}

/**
 * Skeleton loading placeholder component.
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-4 w-[250px]" />
 *
 * @example
 * // Card skeleton
 * <div className="flex items-center space-x-4">
 *   <Skeleton className="h-12 w-12 rounded-full" />
 *   <div className="space-y-2">
 *     <Skeleton className="h-4 w-[250px]" />
 *     <Skeleton className="h-4 w-[200px]" />
 *   </div>
 * </div>
 */
function Skeleton({ className, animate = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-[var(--muted)]",
        animate && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
