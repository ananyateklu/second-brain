import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext } from './themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    // Initialize from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      return savedTheme;
    }
    // If no saved theme, check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const theme = themes[themeName];
    
    console.log('Theme Context Update:', {
      newTheme: themeName,
      isDark: themeName === 'dark' || themeName === 'midnight',
      appliedColors: theme.colors
    });
    
    // Save to localStorage
    localStorage.setItem('theme', themeName);
    
    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set data-theme attribute for CSS selectors
    root.setAttribute('data-theme', themeName);
    
    // Toggle dark class for Tailwind - midnight should also trigger dark mode
    root.classList.toggle('dark', themeName === 'dark' || themeName === 'midnight');
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