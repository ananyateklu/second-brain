import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

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
    return undefined;
  }, [location.pathname]);

  return {
    isTransitioning,
    currentPath: location.pathname,
  };
}

