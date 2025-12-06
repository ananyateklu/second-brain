import { 
  ReactNode, 
  useState, 
  useEffect, 
  useRef, 
  useMemo,
  useCallback,
  CSSProperties 
} from 'react';
import { useLocation } from 'react-router-dom';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

// Check for reduced motion preference
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

interface PageTransitionProps {
  children: ReactNode;
  /** Custom transition duration in ms */
  duration?: number;
  /** Custom easing function */
  easing?: string;
}

type TransitionState = 'entering' | 'entered' | 'exiting';

/**
 * PageTransition Component
 * Provides smooth page transitions with GPU-accelerated animations
 * Optimized for both web browsers and Tauri/WebKit
 */
export function PageTransition({ 
  children, 
  duration: customDuration,
  easing: customEasing,
}: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<TransitionState>('entered');
  const previousPathRef = useRef(location.pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Platform detection for optimized animations
  const isWebKit = useMemo(() => isTauri(), []);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  // Animation configuration based on platform
  const config = useMemo(() => {
    const baseDuration = customDuration ?? (isWebKit ? 200 : 280);
    const exitDuration = isWebKit ? 120 : 150;
    
    return {
      duration: reduceMotion ? 0 : baseDuration,
      exitDuration: reduceMotion ? 0 : exitDuration,
      easing: customEasing ?? 'cubic-bezier(0.22, 1, 0.36, 1)',
      exitEasing: 'cubic-bezier(0.4, 0, 1, 1)',
    };
  }, [customDuration, customEasing, isWebKit, reduceMotion]);

  // Handle route changes
  useEffect(() => {
    // Skip if same path or reduced motion
    if (location.pathname === previousPathRef.current) {
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If reduce motion is preferred, just swap content immediately
    if (reduceMotion) {
      setDisplayChildren(children);
      previousPathRef.current = location.pathname;
      return;
    }

    // Start exit animation
    setTransitionState('exiting');

    // After exit animation, swap content and enter
    timeoutRef.current = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionState('entering');
      previousPathRef.current = location.pathname;

      // After enter animation completes
      timeoutRef.current = setTimeout(() => {
        setTransitionState('entered');
      }, config.duration);
    }, config.exitDuration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, children, config.duration, config.exitDuration, reduceMotion]);

  // Update children if already on same page (for content changes)
  useEffect(() => {
    if (location.pathname === previousPathRef.current && transitionState === 'entered') {
      setDisplayChildren(children);
    }
  }, [children, location.pathname, transitionState]);

  // Get transition styles based on state
  const getTransitionStyles = useCallback((): CSSProperties => {
    // No animation if reduced motion
    if (reduceMotion) {
      return { opacity: 1 };
    }

    const baseStyles: CSSProperties = {
      willChange: transitionState === 'entered' ? 'auto' : 'transform, opacity',
      backfaceVisibility: 'hidden',
    };

    switch (transitionState) {
      case 'exiting':
        return {
          ...baseStyles,
          opacity: 0,
          transform: 'translateY(-8px) scale(0.99)',
          transition: `opacity ${config.exitDuration}ms ${config.exitEasing}, transform ${config.exitDuration}ms ${config.exitEasing}`,
        };
      case 'entering':
        return {
          ...baseStyles,
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          transition: `opacity ${config.duration}ms ${config.easing}, transform ${config.duration}ms ${config.easing}`,
        };
      case 'entered':
      default:
        return {
          ...baseStyles,
          opacity: 1,
          transform: 'translateY(0) scale(1)',
        };
    }
  }, [transitionState, config, reduceMotion]);

  return (
    <div 
      className="page-transition-container w-full h-full"
      style={getTransitionStyles()}
    >
      {displayChildren}
    </div>
  );
}

/**
 * Hook to access page transition state
 * Useful for components that need to coordinate with page transitions
 */
export function usePageTransition() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== previousPathRef.current) {
      setIsTransitioning(true);
      previousPathRef.current = location.pathname;

      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 350); // Match total transition time

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return {
    isTransitioning,
    currentPath: location.pathname,
  };
}

