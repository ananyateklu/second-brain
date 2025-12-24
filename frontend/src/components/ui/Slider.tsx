import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Show the current value label */
  showValue?: boolean;
}

/**
 * Slider component for range input.
 *
 * @example
 * // Basic slider
 * <Slider value={[50]} onValueChange={setValue} max={100} step={1} />
 *
 * @example
 * // Slider with value display
 * <Slider value={[75]} onValueChange={setValue} max={100} showValue />
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue, value, ...props }, ref) => (
  <div className="relative flex w-full items-center gap-2">
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-2 w-full grow overflow-hidden rounded-full",
          "bg-[var(--muted)]"
        )}
      >
        <SliderPrimitive.Range className="absolute h-full bg-[var(--primary)]" />
      </SliderPrimitive.Track>
      {value?.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            "block h-5 w-5 rounded-full border-2 shadow-md",
            "border-[var(--primary)] bg-white",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
    {showValue && value && (
      <span className="min-w-[3rem] text-right text-sm font-medium text-[var(--text-primary)]">
        {value[0]}
      </span>
    )}
  </div>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
