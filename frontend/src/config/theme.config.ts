import type { ThemeConfig } from '../types/themeConfig.types';

export const themeConfig: ThemeConfig = {
  colors: {
    light: {
      note: 'rgb(37, 99, 235)',     // Blue
      idea: '#F59E0B',              // Amber
      task: '#059669',              // Green
      reminder: '#8B5CF6',          // Purple
      tag: '#2563eb'                // Primary-600 (matches Tailwind's primary color)
    },
    dark: {
      note: 'rgb(59, 130, 246)',    // Blue
      idea: '#FCD34D',              // Amber
      task: '#64AB6F',              // Green
      reminder: '#A78BFA',          // Purple
      tag: '#60a5fa'                // Primary-400 (matches Tailwind's primary color)
    }
  }
}; 