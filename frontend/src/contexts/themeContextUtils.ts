import { createContext, useContext } from 'react';
import { ThemeName, ThemeColor } from '../theme/theme.config';
import { themes } from '../theme/theme.config';

export interface ThemeContextType {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
  colors: ThemeColor;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  colors: themes.dark.colors
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 