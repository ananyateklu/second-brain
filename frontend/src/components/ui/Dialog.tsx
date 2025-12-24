import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Source rect for morph animation */
export interface DialogSourceRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

/**
 * Dialog overlay with backdrop blur and fade animation.
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Dialog content container with proper focus management and animations.
 * Supports morph animation from a source element when sourceRect is provided.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Hide the default close button */
    hideCloseButton?: boolean;
    /** Source element rect for morph animation */
    sourceRect?: DialogSourceRect | null;
    /** Accessible description for screen readers (visually hidden) */
    description?: string;
  }
>(({ className, children, hideCloseButton = false, sourceRect, style, description, ...props }, ref) => {
  // Calculate animation starting values based on sourceRect
  const morphStyles = React.useMemo(() => {
    if (!sourceRect) return {};

    // Calculate the offset from center
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Source center position
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;

    // Viewport center
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;

    // Offset from center (where the dialog will end up)
    const offsetX = sourceCenterX - viewportCenterX;
    const offsetY = sourceCenterY - viewportCenterY;

    return {
      '--morph-start-x': `${offsetX}px`,
      '--morph-start-y': `${offsetY}px`,
      '--morph-start-scale': '0.3',
    } as React.CSSProperties;
  }, [sourceRect]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-2xl",
          "rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] shadow-2xl",
          // Use morph animation when sourceRect is provided, otherwise use default
          sourceRect
            ? "animate-dialog-morph-in data-[state=closed]:animate-dialog-morph-out"
            : cn(
                "-translate-x-1/2 -translate-y-1/2 duration-200",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
              ),
          className
        )}
        style={{ ...morphStyles, ...style }}
        {...props}
      >
        {/* Visually hidden description for accessibility when description prop is provided */}
        {description && (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-2.5 rounded-lg p-2 z-50",
              "text-[var(--text-tertiary)] transition-colors",
              "hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              "disabled:pointer-events-none"
            )}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Dialog header section with proper spacing.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 border-b border-[var(--border)] px-6 py-5",
      "rounded-t-3xl bg-[var(--surface-elevated)]",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * Dialog footer section for actions.
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      "border-t border-[var(--border)] px-6 py-4",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * Dialog title with icon support.
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
    icon?: React.ReactNode;
  }
>(({ className, icon, children, ...props }, ref) => (
  <div className="flex items-center gap-3">
    {icon && (
      <div
        className="flex items-center justify-center w-6 h-6 rounded-lg"
        style={{
          background: `linear-gradient(to bottom right, var(--color-brand-600), var(--color-brand-700))`,
        }}
      >
        {icon}
      </div>
    )}
    <DialogPrimitive.Title
      ref={ref}
      className={cn("font-bold text-[var(--text-primary)] leading-none", className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  </div>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Dialog description/subtitle.
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[var(--text-tertiary)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/**
 * Dialog body section for main content.
 */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "p-6 rounded-b-3xl flex-1 overflow-hidden flex flex-col",
      "bg-[var(--surface-elevated)]",
      className
    )}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
};
