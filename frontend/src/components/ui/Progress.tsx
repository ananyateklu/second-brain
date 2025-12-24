import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Show percentage text */
  showValue?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Progress bar component.
 *
 * @example
 * // Basic progress
 * <Progress value={50} />
 *
 * @example
 * // Progress with value display
 * <Progress value={75} showValue />
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className, value = 0, max = 100, showValue = false, size = "md", ...props },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };

    return (
      <div className="flex items-center gap-2 w-full">
        <div
          ref={ref}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-[var(--muted)]",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span className="min-w-[3rem] text-right text-sm font-medium text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
