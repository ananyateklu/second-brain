/**
 * Quick Capture Button (FAB)
 * Floating action button for quick focus item capture
 */

import { memo, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoundStore } from '@/store/bound-store';

export interface QuickCaptureButtonProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Floating action button for quick capture.
 * Appears fixed in the bottom-right corner.
 * Animates on hover and opens the QuickCaptureModal.
 */
export const QuickCaptureButton = memo(function QuickCaptureButton({
  className,
}: QuickCaptureButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openQuickCapture = useBoundStore((state) => state.openQuickCapture);

  const handleClick = useCallback(() => {
    // Get button position for animation origin
    const rect = buttonRef.current?.getBoundingClientRect();
    openQuickCapture(rect ?? null);
  }, [openQuickCapture]);

  // Keyboard shortcut handler (Cmd+Shift+F)
  // This could be moved to a global keyboard hook if needed

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={cn(
        'fixed z-50',
        'bottom-6 right-6',
        'w-14 h-14',
        'rounded-full',
        'hidden md:flex items-center justify-center',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200 ease-out',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className
      )}
      style={{
        backgroundColor: 'var(--color-primary)',
        color: 'white',
      }}
      aria-label="Quick capture new focus item"
      title="Quick capture (⌘⇧F)"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
});

export default QuickCaptureButton;
