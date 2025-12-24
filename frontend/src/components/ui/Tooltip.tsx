import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;

/**
 * Tooltip content with proper styling and animations.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-xl px-3 py-2 text-xs",
      "bg-[var(--primary)] text-[var(--primary-foreground)]",
      "border border-[var(--color-brand-700)]",
      "shadow-lg",
      "animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Legacy-compatible Tooltip wrapper component.
 * Maintains the same API as the previous custom implementation.
 */
export interface TooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: "top" | "bottom" | "left" | "right";
  /** Maximum width of the tooltip */
  maxWidth?: number;
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Additional className for the wrapper */
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  maxWidth = 250,
  delay = 200,
  className = "",
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delay}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", className)}>{children}</span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            side={position}
            style={{ maxWidth }}
          >
            {content}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  );
}

/** Info icon component for use with tooltips */
export function InfoIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${className}`}
      style={{ color: 'var(--color-brand-600)', ...style }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
