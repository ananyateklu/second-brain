import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** Optional label to display next to the switch */
  label?: string;
}

/**
 * Switch component built on Radix UI Switch primitive.
 * Provides an accessible toggle switch with proper styling.
 *
 * @example
 * // Basic switch
 * <Switch checked={enabled} onCheckedChange={setEnabled} />
 *
 * @example
 * // Switch with label
 * <Switch label="Enable notifications" checked={enabled} onCheckedChange={setEnabled} />
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;

  const switchElement = (
    <SwitchPrimitive.Root
      id={switchId}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Unchecked state
        "data-[state=unchecked]:bg-[var(--muted)]",
        // Checked state - uses primary color
        "data-[state=checked]:bg-[var(--primary)]",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (label) {
    return (
      <div className="flex items-center gap-2">
        {switchElement}
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
        >
          {label}
        </label>
      </div>
    );
  }

  return switchElement;
});

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
