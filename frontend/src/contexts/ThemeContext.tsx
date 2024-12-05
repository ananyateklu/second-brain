import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext } from './themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';

// Immediately apply initial theme before any React code runs
const getInitialTheme = (): ThemeName => {
  const savedTheme = localStorage.getItem('theme') as ThemeName;
  if (savedTheme && themes[savedTheme]) {
    return savedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Apply theme immediately during script load
const initialTheme = getInitialTheme();
document.documentElement.setAttribute('data-theme', initialTheme);
document.documentElement.classList.toggle('dark', initialTheme === 'dark' || initialTheme === 'midnight');

// Helper function to apply theme styles
const applyThemeStyles = (themeName: ThemeName) => {
  const theme = themes[themeName];
  const root = document.documentElement;
  
  // Apply CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Set data-theme attribute for CSS selectors
  root.setAttribute('data-theme', themeName);
  
  // Toggle dark class for Tailwind
  root.classList.toggle('dark', themeName === 'dark' || themeName === 'midnight');

  // Add a small transition to smooth out any theme changes
  root.style.setProperty('--theme-transition', 'background-color 0.15s ease-in-out, color 0.15s ease-in-out');
  
  // Ensure all themed elements update
  requestAnimationFrame(() => {
    document.body.style.backgroundColor = getComputedStyle(root).backgroundColor;
  });
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(initialTheme);

  // Apply theme styles on mount and theme changes
  useEffect(() => {
    const theme = themes[themeName];
    
    console.log('Theme Context Update:', {
      newTheme: themeName,
      isDark: themeName === 'dark' || themeName === 'midnight',
      appliedColors: theme.colors
    });
    
    // Save to localStorage
    localStorage.setItem('theme', themeName);
    
    // Apply theme styles
    applyThemeStyles(themeName);

    // Clean up transition property
    return () => {
      document.documentElement.style.removeProperty('--theme-transition');
    };
  }, [themeName]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme') as ThemeName;
      // Only auto-switch if user hasn't explicitly chosen a theme
      if (!savedTheme) {
        setThemeName(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName(prev => {
      switch (prev) {
        case 'light': return 'dark';
        case 'dark': return 'midnight';
        case 'midnight': return 'light';
        default: return 'light';
      }
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    if (themes[name]) {
      setThemeName(name);
    }
  }, []);

  const contextValue = useMemo(() => ({ 
    theme: themeName, 
    toggleTheme,
    setTheme,
    colors: themes[themeName].colors 
  }), [themeName, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}