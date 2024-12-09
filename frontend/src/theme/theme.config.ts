import type { ThemeColor, ThemeConfig, ThemeName } from './themeConfig.types';

export type { ThemeName, ThemeConfig, ThemeColor };

export const themes: Record<ThemeName, ThemeConfig> = {
  light: {
    name: 'Light',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      accent: '#4c9959',
      // Semantic colors
      note: '#2563eb',
      idea: '#f59e0b',
      task: '#059669',
      reminder: '#8b5cf6',
      tag: '#2563eb',
      // Additional UI colors
      surfaceHover: '#f1f5f9',
      surfaceActive: '#e2e8f0',
      divider: '#e2e8f0',
      focus: 'rgba(37, 99, 235, 0.5)',
      gradientBackground: 'bg-gradient-to-br from-white to-gray-100',
      // RGB values for opacity support
      'surface-rgb': '248, 250, 252',
      'text-rgb': '30, 41, 59',
      'border-rgb': '226, 232, 240'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#1e2128',
      surface: '#2a2d35',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#374151',
      accent: '#4c9959',
      // Semantic colors
      note: '#60a5fa',
      idea: '#fcd34d',
      task: '#64ab6f',
      reminder: '#a78bfa',
      tag: '#60a5fa',
      // Additional UI colors
      surfaceHover: '#323842',
      surfaceActive: '#3a424f',
      divider: '#374151',
      focus: 'rgba(96, 165, 250, 0.5)',
      gradientBackground: 'bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800',
      // RGB values for opacity support
      'surface-rgb': '42, 45, 53',
      'text-rgb': '241, 245, 249',
      'border-rgb': '55, 65, 81'
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#1e293b',
      accent: '#4c9959',
      // Semantic colors
      note: '#60a5fa',
      idea: '#fcd34d',
      task: '#64ab6f',
      reminder: '#a78bfa',
      tag: '#60a5fa',
      // Additional UI colors
      surfaceHover: '#2a3a53',
      surfaceActive: '#334766',
      divider: '#1e293b',
      focus: 'rgba(96, 165, 250, 0.5)',
      gradientBackground: 'bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800',
      // RGB values for opacity support
      'surface-rgb': '30, 41, 59',
      'text-rgb': '241, 245, 249',
      'border-rgb': '30, 41, 59'
    }
  }
}; 