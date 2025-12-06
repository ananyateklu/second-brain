import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Performance-optimized dashboard animations hook
 * Provides staggered animations with GPU acceleration for smooth rendering
 * Especially optimized for Tauri/WebKit which struggles with backdrop-filter
 */

interface AnimationConfig {
  /** Base delay before animations start (ms) */
  baseDelay: number;
  /** Delay between each item (ms) */
  staggerDelay: number;
  /** Animation duration (ms) */
  duration: number;
  /** Whether to use reduced motion (respects user preference) */
  reduceMotion: boolean;
  /** Whether running in Tauri (WebKit) - reduces expensive effects */
  isTauri: boolean;
}

interface AnimatedItemState {
  /** Whether the item should be visible */
  isVisible: boolean;
  /** Animation delay for this specific item */
  delay: number;
  /** Style object for the animation */
  style: React.CSSProperties;
  /** CSS class for the animation */
  className: string;
}

interface UseDashboardAnimationsReturn {
  /** Whether all animations are ready */
  isReady: boolean;
  /** Get animation state for a specific item index */
  getItemAnimation: (index: number, total?: number) => AnimatedItemState;
  /** Get animation state for a section (charts, etc.) */
  getSectionAnimation: (sectionIndex: number) => AnimatedItemState;
  /** Animation config being used */
  config: AnimationConfig;
  /** Force trigger animations (useful for time range changes) */
  triggerAnimations: () => void;
  /** GPU-optimized blur amount based on platform */
  blurAmount: string;
  /** Whether to show ambient glow effects */
  showGlow: boolean;
}

// Detect if running in Tauri
const detectTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

// Check for reduced motion preference
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const DEFAULT_CONFIG: AnimationConfig = {
  baseDelay: 50,
  staggerDelay: 40,
  duration: 400,
  reduceMotion: false,
  isTauri: false,
};

// Tauri-optimized config with faster animations and reduced effects
const TAURI_CONFIG: AnimationConfig = {
  baseDelay: 30,
  staggerDelay: 25,
  duration: 300,
  reduceMotion: false,
  isTauri: true,
};

export function useDashboardAnimations(
  isDataLoaded: boolean = true,
  itemCount: number = 0
): UseDashboardAnimationsReturn {
  const [isReady, setIsReady] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const mountedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine config based on environment
  const config = useMemo<AnimationConfig>(() => {
    const isTauri = detectTauri();
    const reduceMotion = prefersReducedMotion();
    
    const baseConfig = isTauri ? TAURI_CONFIG : DEFAULT_CONFIG;
    
    return {
      ...baseConfig,
      reduceMotion,
      isTauri,
      // Reduce durations if user prefers reduced motion
      duration: reduceMotion ? 0 : baseConfig.duration,
      staggerDelay: reduceMotion ? 0 : baseConfig.staggerDelay,
      baseDelay: reduceMotion ? 0 : baseConfig.baseDelay,
    };
  }, []);

  // Calculate appropriate blur based on platform
  const blurAmount = useMemo(() => {
    if (config.reduceMotion) return '0px';
    // WebKit struggles with backdrop-blur, use smaller values
    return config.isTauri ? '8px' : '16px';
  }, [config.isTauri, config.reduceMotion]);

  // Whether to show ambient glow effects (expensive on WebKit)
  const showGlow = useMemo(() => {
    if (config.reduceMotion) return false;
    // Disable glow on Tauri for performance
    return !config.isTauri;
  }, [config.isTauri, config.reduceMotion]);

  // Trigger animations on mount and when data loads
  useEffect(() => {
    if (!isDataLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(false);
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Small delay to allow DOM to settle
    timeoutRef.current = setTimeout(() => {
      setIsReady(true);
      mountedRef.current = true;
    }, config.baseDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isDataLoaded, animationKey, config.baseDelay]);

  // Function to trigger re-animation (e.g., after filter changes)
  const triggerAnimations = useCallback(() => {
    setIsReady(false);
    setAnimationKey((prev) => prev + 1);
  }, []);

  // Get animation state for a specific item
  const getItemAnimation = useCallback(
    (index: number, _total: number = itemCount): AnimatedItemState => {
      const delay = config.baseDelay + index * config.staggerDelay;
      
      // Calculate animation completion time for this item
      const isVisible = isReady;

      // Use transform for GPU acceleration instead of margin/opacity transitions
      const style: React.CSSProperties = config.reduceMotion
        ? { opacity: isVisible ? 1 : 0 }
        : {
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
            transitionProperty: 'opacity, transform',
            transitionDuration: `${config.duration}ms`,
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: `${delay}ms`,
            // GPU acceleration hints
            willChange: isVisible ? 'auto' : 'transform, opacity',
            backfaceVisibility: 'hidden' as const,
          };

      // Animation class based on state
      const className = isVisible
        ? 'dashboard-item-visible'
        : 'dashboard-item-hidden';

      return {
        isVisible,
        delay,
        style,
        className,
      };
    },
    [isReady, config, itemCount]
  );

  // Get animation state for sections (charts, model usage, etc.)
  const getSectionAnimation = useCallback(
    (sectionIndex: number): AnimatedItemState => {
      // Sections animate after all stat cards
      const sectionBaseDelay = config.baseDelay + itemCount * config.staggerDelay;
      const delay = sectionBaseDelay + sectionIndex * (config.staggerDelay * 2);
      
      const isVisible = isReady;

      const style: React.CSSProperties = config.reduceMotion
        ? { opacity: isVisible ? 1 : 0 }
        : {
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transitionProperty: 'opacity, transform',
            transitionDuration: `${config.duration + 100}ms`,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: `${delay}ms`,
            willChange: isVisible ? 'auto' : 'transform, opacity',
            backfaceVisibility: 'hidden' as const,
          };

      const className = isVisible
        ? 'dashboard-section-visible'
        : 'dashboard-section-hidden';

      return {
        isVisible,
        delay,
        style,
        className,
      };
    },
    [isReady, config, itemCount]
  );

  return {
    isReady,
    getItemAnimation,
    getSectionAnimation,
    config,
    triggerAnimations,
    blurAmount,
    showGlow,
  };
}

/**
 * Hook for individual animated items
 * Use this for components that need their own animation state
 */
export function useAnimatedVisibility(
  isVisible: boolean,
  delay: number = 0,
  duration: number = 400
): React.CSSProperties {
  const [hasAppeared, setHasAppeared] = useState(false);
  const isTauri = useMemo(() => detectTauri(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (!isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasAppeared(false);
      return;
    }

    const timer = setTimeout(() => {
      setHasAppeared(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, delay]);

  if (reduceMotion) {
    return { opacity: hasAppeared ? 1 : 0 };
  }

  // Shorter duration for Tauri
  const actualDuration = isTauri ? Math.min(duration, 300) : duration;

  return {
    opacity: hasAppeared ? 1 : 0,
    transform: hasAppeared ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
    transition: `opacity ${actualDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1), transform ${actualDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
    willChange: hasAppeared ? 'auto' : 'transform, opacity',
    backfaceVisibility: 'hidden' as const,
  };
}

