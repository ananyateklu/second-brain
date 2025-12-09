/**
 * Chat Input Height Hook
 * 
 * Manages dynamic height calculations for the chat input based on focus state.
 * Uses CSS transitions for smooth, GPU-accelerated animations.
 * 
 * Height behavior:
 * - Focused: max 70% of viewport height (expandable based on content)
 * - Unfocused: max 30% of viewport height
 * - Content always scrollable when it exceeds max height
 * - Smooth 300ms transition between states
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

export interface ChatInputHeightConfig {
  /** Maximum height when focused (as percentage of viewport height) */
  focusedMaxHeightVh?: number;
  /** Maximum height when unfocused (as percentage of viewport height) */
  unfocusedMaxHeightVh?: number;
  /** Minimum height for the input area */
  minHeight?: number;
  /** Transition duration in milliseconds */
  transitionDuration?: number;
  /** Whether to disable height animations entirely */
  disableAnimation?: boolean;
}

export interface ChatInputHeightState {
  /** Whether the input is currently focused */
  isFocused: boolean;
  /** Current max height in pixels */
  maxHeight: number;
  /** Current max height in vh units */
  maxHeightVh: number;
  /** Whether content is scrollable (exceeds container) */
  isScrollable: boolean;
  /** Current content height */
  contentHeight: number;
}

export interface ChatInputHeightActions {
  /** Set focus state */
  setFocused: (focused: boolean) => void;
  /** Handle focus event */
  handleFocus: () => void;
  /** Handle blur event */
  handleBlur: () => void;
  /** Update content height (called when content changes) */
  updateContentHeight: (height: number) => void;
  /** Force recalculate heights (e.g., on window resize) */
  recalculate: () => void;
}

export interface ChatInputHeightResult extends ChatInputHeightState, ChatInputHeightActions {
  /** CSS class names for the container */
  containerClassName: string;
  /** Inline styles for the container */
  containerStyle: React.CSSProperties;
  /** CSS class names for the textarea wrapper */
  textareaWrapperClassName: string;
  /** Inline styles for the textarea wrapper */
  textareaWrapperStyle: React.CSSProperties;
}

const DEFAULT_CONFIG: Required<ChatInputHeightConfig> = {
  focusedMaxHeightVh: 70,
  unfocusedMaxHeightVh: 30,
  minHeight: 48,
  transitionDuration: 300,
  disableAnimation: false,
};

/**
 * Hook for managing chat input height with focus-aware sizing
 */
export function useChatInputHeight(
  config: ChatInputHeightConfig = {}
): ChatInputHeightResult {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const [isFocused, setIsFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  // Track if we're in a transition to prevent jank
  const isTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate pixel values from vh
  const focusedMaxHeightPx = useMemo(
    () => (viewportHeight * mergedConfig.focusedMaxHeightVh) / 100,
    [viewportHeight, mergedConfig.focusedMaxHeightVh]
  );

  const unfocusedMaxHeightPx = useMemo(
    () => (viewportHeight * mergedConfig.unfocusedMaxHeightVh) / 100,
    [viewportHeight, mergedConfig.unfocusedMaxHeightVh]
  );

  // Current max height based on focus state
  const maxHeight = isFocused ? focusedMaxHeightPx : unfocusedMaxHeightPx;
  const maxHeightVh = isFocused
    ? mergedConfig.focusedMaxHeightVh
    : mergedConfig.unfocusedMaxHeightVh;

  // Check if content is scrollable
  const isScrollable = contentHeight > maxHeight;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manage transition state
  const startTransition = useCallback(() => {
    isTransitioningRef.current = true;

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // End transition after duration
    transitionTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
    }, mergedConfig.transitionDuration);
  }, [mergedConfig.transitionDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Actions
  const setFocused = useCallback(
    (focused: boolean) => {
      if (focused !== isFocused) {
        startTransition();
        setIsFocused(focused);
      }
    },
    [isFocused, startTransition]
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, [setFocused]);

  const handleBlur = useCallback(() => {
    // Small delay to allow clicking buttons without collapse
    setTimeout(() => {
      // Only blur if not clicking within the input area
      if (document.activeElement?.closest('.chat-input-container') === null) {
        setFocused(false);
      }
    }, 100);
  }, [setFocused]);

  const updateContentHeight = useCallback((height: number) => {
    setContentHeight(height);
  }, []);

  const recalculate = useCallback(() => {
    setViewportHeight(window.innerHeight);
  }, []);

  // Generate CSS classes and styles
  const containerClassName = useMemo(() => {
    const classes = ['chat-input-container', 'chat-input-dynamic'];
    if (isFocused) {
      classes.push('chat-input-focused');
    } else {
      classes.push('chat-input-blurred');
    }
    if (isScrollable) {
      classes.push('chat-input-scrollable');
    }
    if (mergedConfig.disableAnimation) {
      classes.push('chat-input-no-animation');
    }
    return classes.join(' ');
  }, [isFocused, isScrollable, mergedConfig.disableAnimation]);

  const containerStyle = useMemo((): React.CSSProperties => {
    const style: React.CSSProperties = {
      maxHeight: `${maxHeightVh}vh`,
      minHeight: `${mergedConfig.minHeight}px`,
      transition: mergedConfig.disableAnimation
        ? 'none'
        : `max-height ${mergedConfig.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      willChange: 'max-height',
      contain: 'layout',
    };
    return style;
  }, [maxHeightVh, mergedConfig]);

  const textareaWrapperClassName = useMemo(() => {
    const classes = ['chat-input-textarea-wrapper'];
    if (isScrollable) {
      classes.push('chat-input-textarea-scrollable');
    }
    return classes.join(' ');
  }, [isScrollable]);

  const textareaWrapperStyle = useMemo((): React.CSSProperties => {
    return {
      overflowY: 'auto',
      maxHeight: '100%',
      scrollbarGutter: 'stable',
    };
  }, []);

  return {
    // State
    isFocused,
    maxHeight,
    maxHeightVh,
    isScrollable,
    contentHeight,
    // Actions
    setFocused,
    handleFocus,
    handleBlur,
    updateContentHeight,
    recalculate,
    // CSS
    containerClassName,
    containerStyle,
    textareaWrapperClassName,
    textareaWrapperStyle,
  };
}

/**
 * Default export for convenience
 */
export default useChatInputHeight;
