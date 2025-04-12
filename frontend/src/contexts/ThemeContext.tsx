import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext } from './themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';

const getInitialTheme = (): ThemeName => {
  const savedTheme = localStorage.getItem('theme') as ThemeName;
  if (savedTheme && themes[savedTheme]) {
    return savedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (themeName: ThemeName) => {
  const theme = themes[themeName];
  const root = document.documentElement;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Remove existing theme classes
  root.classList.remove('light', 'dark', 'midnight', 'full-dark');
  root.classList.add(themeName);

  // Set data-theme attribute
  root.setAttribute('data-theme', themeName);

  // Set color-scheme
  root.style.colorScheme = themeName === 'light' ? 'light' : 'dark';

  // Apply CSS variables with both formats for compatibility
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Set both formats of variables for maximum compatibility
    root.style.setProperty(`--${key}`, value);
    root.style.setProperty(`--color-${key}`, value);
  });

  // Safari-specific fixes
  if (isSafari) {
    // Set note card background colors for Safari - KEEPING these specific overrides for now
    if (themeName === 'midnight') {
      root.style.setProperty('--note-bg-opacity', '0.3');
      root.style.setProperty('--note-bg-color', '#1e293b');
      root.style.backgroundColor = theme.colors.background;
      document.body.style.backgroundColor = theme.colors.background;
    } else if (themeName === 'dark') {
      root.style.setProperty('--note-bg-opacity', '0.3');
      root.style.setProperty('--note-bg-color', 'rgb(17, 24, 39)');
      root.style.backgroundColor = theme.colors.background;
      document.body.style.backgroundColor = theme.colors.background;
    } else if (themeName === 'full-dark') {
      root.style.setProperty('--note-bg-opacity', '0.4');
      root.style.setProperty('--note-bg-color', '#27272a'); // Matches new config surface for full-dark
      root.style.backgroundColor = theme.colors.background;
      document.body.style.backgroundColor = theme.colors.background;
    } else { // Light theme
      root.style.removeProperty('--note-bg-opacity');
      root.style.removeProperty('--note-bg-color');
      root.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    }

    // Force a repaint in Safari - KEEPING
    const body = document.body;
    body.style.display = 'none';
    window.getComputedStyle(body).getPropertyValue('height'); // Force reflow
    body.style.display = '';

    // Apply solid background colors for Safari
    const selectorElement = document.querySelector('.theme-selector');
    if (selectorElement) {
      selectorElement.classList.add('safari');
    }
  }

  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors.background);
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(getInitialTheme());

  useEffect(() => {
    localStorage.setItem('theme', themeName);
    applyTheme(themeName);
  }, [themeName]);

  const toggleTheme = useCallback(() => {
    setThemeName(prev => {
      switch (prev) {
        case 'light': return 'dark';
        case 'dark': return 'midnight';
        case 'midnight': return 'full-dark';
        case 'full-dark': return 'light';
        default: return 'light'; // Fallback
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