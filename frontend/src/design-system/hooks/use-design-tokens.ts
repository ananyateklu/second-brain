/**
 * useDesignTokens Hook
 * Runtime access to computed CSS custom property values
 */

import { useCallback, useEffect, useState } from 'react';
import { tokens, type Tokens } from '../tokens';

/**
 * Get computed CSS custom property value
 */
function getCSSVariable(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Set CSS custom property value
 */
function setCSSVariable(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(name, value);
}

/**
 * Check if a value is a CSS variable reference
 */
function isCSSVariable(value: string): boolean {
  return value.startsWith('var(--') && value.endsWith(')');
}

/**
 * Extract variable name from var() reference
 */
function extractVariableName(value: string): string | null {
  const match = /var\(--([^,)]+)/.exec(value);
  return match ? `--${match[1]}` : null;
}

/**
 * Hook return type
 */
export interface UseDesignTokensReturn {
  /** All design tokens */
  tokens: Tokens;

  /** Get computed value of a token */
  getComputedValue: (tokenValue: string) => string;

  /** Set a CSS custom property */
  setVariable: (name: string, value: string) => void;

  /** Current theme (from data-theme attribute) */
  theme: string;

  /** Whether the system is in dark mode */
  isDarkMode: boolean;
}

/**
 * useDesignTokens Hook
 * Provides access to design tokens with runtime CSS variable resolution
 */
export function useDesignTokens(): UseDesignTokensReturn {
  const [theme, setTheme] = useState<string>('dark');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Track theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
      setIsDarkMode(currentTheme === 'dark' || currentTheme === 'blue');
    };

    // Initial value
    updateTheme();

    // Watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => { observer.disconnect(); };
  }, []);

  /**
   * Get computed value of a CSS variable
   */
  const getComputedValue = useCallback((tokenValue: string): string => {
    // Inner recursive function to resolve CSS variables
    const resolveValue = (value: string): string => {
      if (!isCSSVariable(value)) {
        return value;
      }

      const varName = extractVariableName(value);
      if (!varName) return value;

      const computed = getCSSVariable(varName);

      // If the computed value is also a CSS variable, resolve it recursively
      if (isCSSVariable(computed)) {
        return resolveValue(computed);
      }

      return computed || value;
    };

    return resolveValue(tokenValue);
  }, []);

  /**
   * Set a CSS custom property
   */
  const setVariable = useCallback((name: string, value: string): void => {
    const varName = name.startsWith('--') ? name : `--${name}`;
    setCSSVariable(varName, value);
  }, []);

  return {
    tokens,
    getComputedValue,
    setVariable,
    theme,
    isDarkMode,
  };
}

/**
 * Hook for a single token value with live updates
 */
export function useTokenValue(tokenValue: string): string {
  const { getComputedValue, theme } = useDesignTokens();
  // Compute initial value lazily, re-compute when theme changes
  const [value, setValue] = useState(() =>
    isCSSVariable(tokenValue) ? getComputedValue(tokenValue) : tokenValue
  );

  useEffect(() => {
    // Re-compute when theme changes - valid external state sync
    if (isCSSVariable(tokenValue)) {
      const newValue = getComputedValue(tokenValue);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(prev => prev !== newValue ? newValue : prev);
    }
  }, [tokenValue, theme, getComputedValue]);

  return value;
}

/**
 * Hook for checking current theme
 */
export function useTheme() {
  const { theme, isDarkMode } = useDesignTokens();

  return {
    theme,
    isDarkMode,
    isLightMode: theme === 'light',
    isBlueTheme: theme === 'blue',
  };
}
