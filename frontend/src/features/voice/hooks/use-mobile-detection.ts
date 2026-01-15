/**
 * Mobile Detection Hook
 *
 * Provides mobile state detection with resize listener.
 * Also handles mobile sidebar escape key and body scroll lock.
 */

import { useState, useLayoutEffect, useEffect } from 'react';

interface UseMobileDetectionOptions {
  /** Breakpoint width for mobile detection (default: 768) */
  breakpoint?: number;
  /** Whether sidebar is visible (for escape key and scroll lock) */
  sidebarVisible?: boolean;
  /** Callback to close sidebar */
  onCloseSidebar?: () => void;
}

interface UseMobileDetectionReturn {
  isMobile: boolean;
}

export function useMobileDetection({
  breakpoint = 768,
  sidebarVisible = false,
  onCloseSidebar,
}: UseMobileDetectionOptions = {}): UseMobileDetectionReturn {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  // Update mobile state on resize
  useLayoutEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    if (!onCloseSidebar) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && sidebarVisible) {
        onCloseSidebar();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, sidebarVisible, onCloseSidebar]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarVisible]);

  return { isMobile };
}

export type { UseMobileDetectionOptions, UseMobileDetectionReturn };
