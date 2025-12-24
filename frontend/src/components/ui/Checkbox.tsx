import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  /** Optional label to display next to the checkbox */
  label?: string;
}

/**
 * Checkbox component built on Radix UI Checkbox primitive.
 * Provides an accessible checkbox with proper styling.
 *
 * @example
 * // Basic checkbox
 * <Checkbox checked={agreed} onCheckedChange={setAgreed} />
 *
 * @example
 * // Checkbox with label
 * <Checkbox label="I agree to the terms" checked={agreed} onCheckedChange={setAgreed} />
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const checkboxId = id || React.useId();

  const checkboxElement = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={checkboxId}
      className={cn(
        "peer h-5 w-5 shrink-0 rounded-md border shadow-sm",
        "border-[var(--border)] bg-[var(--surface-elevated)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (label) {
    return (
      <div className="flex items-center gap-2">
        {checkboxElement}
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-none text-[var(--text-primary)] cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      </div>
    );
  }

  return checkboxElement;
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
