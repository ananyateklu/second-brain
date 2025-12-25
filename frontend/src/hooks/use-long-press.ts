import { useCallback, useRef, useState } from 'react';

export interface UseLongPressOptions {
  /** Called when press duration reaches the threshold */
  onLongPress: () => void;
  /** Called when press is released before the threshold (short click) */
  onShortPress?: () => void;
  /** Duration in ms before triggering long press (default: 2000) */
  duration?: number;
  /** Callback with progress (0 to 1) during hold for visual feedback */
  onProgress?: (progress: number) => void;
  /** Interval for progress updates in ms (default: 16 for ~60fps) */
  progressInterval?: number;
}

export interface UseLongPressReturn {
  /** Bind these to the element */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  /** Whether the element is currently being pressed */
  isPressed: boolean;
  /** Current progress (0 to 1) */
  progress: number;
}

/**
 * Hook for detecting press-and-hold gestures with progress feedback
 *
 * @example
 * ```tsx
 * const { handlers, progress, isPressed } = useLongPress({
 *   onLongPress: () => expandSidebar(),
 *   onShortPress: () => toggleSidebar(),
 *   duration: 2000,
 *   onProgress: (p) => setHoldProgress(p),
 * });
 *
 * return <button {...handlers}>Toggle</button>;
 * ```
 */
export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
  const {
    onLongPress,
    onShortPress,
    duration = 2000,
    onProgress,
    progressInterval = 16,
  } = options;

  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(0);
    onProgress?.(0);
  }, [onProgress]);

  const start = useCallback(() => {
    completedRef.current = false;
    startTimeRef.current = Date.now();
    setIsPressed(true);

    // Start progress updates
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min(elapsed / duration, 1);
      setProgress(currentProgress);
      onProgress?.(currentProgress);

      // When progress completes, trigger long press and cleanup
      if (currentProgress >= 1 && !completedRef.current) {
        completedRef.current = true;
        // Clear the interval
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        // Clear the timeout (it may not have fired yet due to timing)
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsPressed(false);
        setProgress(0);
        onProgress?.(0);
        onLongPress();
      }
    }, progressInterval);

    // Backup timeout in case interval timing is off
    timerRef.current = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        cleanup();
        setIsPressed(false);
        onLongPress();
      }
    }, duration + 50); // Add small buffer
  }, [duration, onLongPress, onProgress, progressInterval, cleanup]);

  const cancel = useCallback(() => {
    const wasCompleted = completedRef.current;
    cleanup();
    setIsPressed(false);

    // Only trigger short press if we didn't complete long press
    if (!wasCompleted && onShortPress) {
      onShortPress();
    }
  }, [cleanup, onShortPress]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only respond to left click
    if (e.button !== 0) return;
    e.preventDefault();
    start();
  }, [start]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    cancel();
  }, [cancel]);

  const handleMouseLeave = useCallback(() => {
    if (isPressed) {
      cancel();
    }
  }, [isPressed, cancel]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    start();
  }, [start]);

  const handleTouchEnd = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
    isPressed,
    progress,
  };
}
