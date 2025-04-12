import type { ThemeColor, ThemeConfig, ThemeName } from './themeConfig.types';

export type { ThemeName, ThemeConfig, ThemeColor };

// Helper for color mix simulation if needed, otherwise define static values
// const simulateColorMix = (bg: string, surface: string, bgRatio: number) => { ... };
// For now, we'll use static values derived from inspection or direct mapping.

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
      'border-rgb': '226, 232, 240',

      // New Semantic Colors (Derived from component logic for light theme)
      sidebarBackground: 'rgba(248, 250, 252, 0.8)', // Simulating color-mix/opacity
      headerBackground: 'rgba(248, 250, 252, 0.8)', // Simulating color-mix/opacity
      welcomeBarBackground: 'rgba(248, 250, 252, 0.8)', // Simulating color-mix/opacity
      dashboardHomeBackground: 'rgba(248, 250, 252, 0.8)', // Simulating color-mix/opacity
      chatInterfaceBackground: 'rgba(248, 250, 252, 0.8)', // Simulating color-mix/opacity
      conversationHistoryBackground: 'rgba(248, 250, 252, 0.98)', // Simulating color-mix/opacity
      statsEditorBackground: 'rgba(255, 255, 255, 0.9)', // From StatsEditor.tsx
      statsEditorBorder: '#e5e7eb', // border-gray-200 from StatsEditor.tsx
      activityItemBorder: 'rgba(59, 130, 246, 0.1)', // border-blue-200/30 with adjustment
      activityItemBorderHover: 'rgba(96, 165, 250, 0.3)', // border-blue-400/50 adjustment
      themeSelectorContainerBackground: 'rgba(248, 250, 252, 0.95)', // From ThemeSelector.tsx Safari logic adjusted
      themeSelectorButtonBackground: 'transparent', // Base state
      themeSelectorButtonBackgroundHover: '#f1f5f9', // From ThemeSelector.tsx Safari logic
      themeSelectorButtonBackgroundSelected: 'rgba(76, 153, 89, 0.1)', // #4c9959/10
      themeSelectorButtonText: '#374151', // text-gray-700
      themeSelectorButtonTextSelected: '#4c9959',
      themeDropdownButtonBackground: 'rgba(248, 250, 252, 0.8)', // From ThemeDropdown.tsx
      themeDropdownButtonBackgroundHover: 'rgba(241, 245, 249, 0.9)', // From ThemeDropdown.tsx
      themeDropdownBackground: 'rgba(248, 250, 252, 0.95)', // From ThemeDropdown.tsx
      themeDropdownBorder: 'rgba(226, 232, 240, 0.6)', // From ThemeDropdown.tsx
      themeDropdownItemBackground: 'transparent', // Base state
      themeDropdownItemBackgroundHover: 'rgba(241, 245, 249, 0.3)', // From ThemeDropdown.tsx
      themeDropdownItemBackgroundSelected: 'rgba(241, 245, 249, 0.5)', // From ThemeDropdown.tsx
      themeDropdownItemText: '#1e293b', // From ThemeDropdown.tsx
      themeDropdownItemTextSelected: '#4c9959', // From ThemeDropdown.tsx
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#1e2128',
      surface: '#0f1b2d',
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
      surfaceHover: '#1f2937',
      surfaceActive: '#374151',
      divider: '#374151',
      focus: 'rgba(96, 165, 250, 0.5)',
      gradientBackground: 'bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800',
      // RGB values for opacity support
      'surface-rgb': '17, 24, 39',
      'text-rgb': '241, 245, 249',
      'border-rgb': '55, 65, 81',

      // New Semantic Colors (Derived from component logic for dark theme)
      sidebarBackground: 'rgba(17, 24, 39, 0.3)', // bg-gray-900/30
      headerBackground: 'rgba(17, 24, 39, 0.3)', // bg-gray-900/30
      welcomeBarBackground: 'rgba(15, 27, 45, 0.3)', // Changed to blue tone
      dashboardHomeBackground: 'rgba(15, 27, 45, 0.3)', // Changed to blue tone
      chatInterfaceBackground: 'rgba(15, 27, 45, 0.3)', // Changed to blue tone
      conversationHistoryBackground: 'rgba(15, 27, 45, 0.95)', // Changed to blue tone
      statsEditorBackground: 'rgba(17, 24, 39, 0.7)', // bg-gray-900/70
      statsEditorBorder: 'rgba(55, 65, 81, 0.5)', // border-gray-700/50
      activityItemBorder: 'rgba(29, 78, 216, 0.1)', // border-blue-700/30 adjustment
      activityItemBorderHover: 'rgba(59, 130, 246, 0.3)', // border-blue-500/50 adjustment
      themeSelectorContainerBackground: 'rgba(17, 24, 39, 0.3)', // bg-gray-900/30 (Safari value from ThemeSelector)
      themeSelectorButtonBackground: 'transparent',
      themeSelectorButtonBackgroundHover: '#323842', // From ThemeSelector Safari logic
      themeSelectorButtonBackgroundSelected: 'rgba(76, 153, 89, 0.1)', // #4c9959/10
      themeSelectorButtonText: '#e5e7eb', // text-gray-200
      themeSelectorButtonTextSelected: '#4c9959',
      themeDropdownButtonBackground: 'rgba(42, 45, 53, 0.8)', // From ThemeDropdown.tsx
      themeDropdownButtonBackgroundHover: 'rgba(50, 56, 66, 0.9)', // From ThemeDropdown.tsx
      themeDropdownBackground: 'rgba(42, 45, 53, 0.95)', // From ThemeDropdown.tsx
      themeDropdownBorder: 'rgba(55, 65, 81, 0.6)', // From ThemeDropdown.tsx
      themeDropdownItemBackground: 'transparent',
      themeDropdownItemBackgroundHover: 'rgba(50, 56, 66, 0.3)', // From ThemeDropdown.tsx
      themeDropdownItemBackgroundSelected: 'rgba(50, 56, 66, 0.5)', // From ThemeDropdown.tsx
      themeDropdownItemText: '#f1f5f9', // From ThemeDropdown.tsx
      themeDropdownItemTextSelected: '#4c9959', // From ThemeDropdown.tsx
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#0f172a', // slate-900
      surface: '#1e293b', // slate-800
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#1e293b', // slate-800
      accent: '#4c9959',
      // Semantic colors
      note: '#60a5fa',
      idea: '#fcd34d',
      task: '#64ab6f',
      reminder: '#a78bfa',
      tag: '#60a5fa',
      // Additional UI colors
      surfaceHover: '#2a3a53', // Custom derived hover for slate-800
      surfaceActive: '#334766', // Custom derived active for slate-800
      divider: '#1e293b',
      focus: 'rgba(96, 165, 250, 0.5)',
      gradientBackground: 'bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800',
      // RGB values for opacity support
      'surface-rgb': '30, 41, 59',
      'text-rgb': '241, 245, 249',
      'border-rgb': '30, 41, 59',

      // New Semantic Colors (Derived from component logic for midnight theme)
      sidebarBackground: 'rgba(255, 255, 255, 0.05)', // bg-white/5
      headerBackground: 'rgba(255, 255, 255, 0.05)', // bg-white/5
      welcomeBarBackground: 'rgba(30, 41, 59, 0.3)', // bg-[#1e293b]/30
      dashboardHomeBackground: 'rgba(30, 41, 59, 0.3)', // bg-[#1e293b]/30
      chatInterfaceBackground: 'rgba(30, 41, 59, 0.3)', // bg-[#1e293b]/30
      conversationHistoryBackground: 'rgba(30, 41, 59, 0.95)', // bg-[#1e293b]/95
      statsEditorBackground: 'rgba(30, 41, 59, 0.5)', // bg-[#1e293b]/50
      statsEditorBorder: 'rgba(255, 255, 255, 0.1)', // border-white/10
      activityItemBorder: 'rgba(29, 78, 216, 0.1)', // border-blue-700/30 adjustment
      activityItemBorderHover: 'rgba(59, 130, 246, 0.3)', // border-blue-500/50 adjustment
      themeSelectorContainerBackground: 'rgba(30, 41, 59, 0.95)', // bg-[#1e293b]/95 (Safari value from ThemeSelector)
      themeSelectorButtonBackground: 'transparent',
      themeSelectorButtonBackgroundHover: '#2a3a53', // From ThemeSelector Safari logic
      themeSelectorButtonBackgroundSelected: 'rgba(76, 153, 89, 0.1)', // #4c9959/10
      themeSelectorButtonText: '#e5e7eb', // text-gray-200
      themeSelectorButtonTextSelected: '#4c9959',
      themeDropdownButtonBackground: 'rgba(30, 41, 59, 0.8)', // From ThemeDropdown.tsx
      themeDropdownButtonBackgroundHover: 'rgba(42, 58, 83, 0.9)', // From ThemeDropdown.tsx
      themeDropdownBackground: 'rgba(30, 41, 59, 0.95)', // From ThemeDropdown.tsx
      themeDropdownBorder: 'rgba(30, 41, 59, 0.6)', // From ThemeDropdown.tsx
      themeDropdownItemBackground: 'transparent',
      themeDropdownItemBackgroundHover: 'rgba(42, 58, 83, 0.3)', // From ThemeDropdown.tsx
      themeDropdownItemBackgroundSelected: 'rgba(42, 58, 83, 0.5)', // From ThemeDropdown.tsx
      themeDropdownItemText: '#f1f5f9', // From ThemeDropdown.tsx
      themeDropdownItemTextSelected: '#4c9959', // From ThemeDropdown.tsx
    }
  },
  'full-dark': {
    name: 'Full Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#000000',
      surface: '#18181b', // zinc-900, more opaque than original rgba
      text: '#ededed',
      textSecondary: '#a1a1aa', // zinc-400
      border: '#27272a', // zinc-800, more opaque than original rgba
      accent: '#4c9959',
      // Semantic colors
      note: '#60a5fa',
      idea: '#fcd34d',
      task: '#64ab6f',
      reminder: '#a78bfa',
      tag: '#60a5fa',
      // Additional UI colors
      surfaceHover: '#27272a', // zinc-800
      surfaceActive: '#3f3f46', // zinc-700
      divider: '#27272a', // zinc-800
      focus: 'rgba(96, 165, 250, 0.5)',
      gradientBackground: 'bg-gradient-to-br from-[#000000] via-[#050505] to-[#0f0f0f]',
      // RGB values for opacity support
      'surface-rgb': '24, 24, 27', // zinc-900 rgb
      'text-rgb': '237, 237, 237',
      'border-rgb': '39, 39, 42', // zinc-800 rgb

      // New Semantic Colors (Derived from component logic for full-dark theme)
      // Using surface-rgb for opacity simulation where needed
      sidebarBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      headerBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      welcomeBarBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      dashboardHomeBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      chatInterfaceBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      conversationHistoryBackground: 'rgba(24, 24, 27, 0.95)', // rgba(var(--color-surface-rgb),0.95)
      statsEditorBackground: 'rgba(24, 24, 27, 0.8)', // rgba(var(--color-surface-rgb),0.8)
      statsEditorBorder: 'rgba(39, 39, 42, 0.5)', // border-[rgba(var(--color-border-rgb),0.5)]
      activityItemBorder: 'rgba(55, 65, 81, 0.3)', // border-gray-700/30 adjustment
      activityItemBorderHover: 'rgba(82, 82, 91, 0.5)', // border-gray-600/50 adjustment
      themeSelectorContainerBackground: 'rgba(0, 0, 0, 0.85)', // From ThemeSelector Safari logic
      themeSelectorButtonBackground: 'transparent',
      themeSelectorButtonBackgroundHover: 'rgba(25, 25, 25, 0.9)', // From ThemeSelector Safari logic
      themeSelectorButtonBackgroundSelected: 'rgba(76, 153, 89, 0.1)', // #4c9959/10
      themeSelectorButtonText: '#e5e7eb', // text-gray-200
      themeSelectorButtonTextSelected: '#4c9959',
      themeDropdownButtonBackground: 'rgba(0, 0, 0, 0.7)', // From ThemeDropdown.tsx
      themeDropdownButtonBackgroundHover: 'rgba(20, 20, 20, 0.8)', // From ThemeDropdown.tsx
      themeDropdownBackground: 'rgba(0, 0, 0, 0.9)', // From ThemeDropdown.tsx
      themeDropdownBorder: 'rgba(25, 25, 25, 0.6)', // From ThemeDropdown.tsx
      themeDropdownItemBackground: 'transparent',
      themeDropdownItemBackgroundHover: 'rgba(25, 25, 25, 0.3)', // From ThemeDropdown.tsx
      themeDropdownItemBackgroundSelected: 'rgba(25, 25, 25, 0.5)', // From ThemeDropdown.tsx
      themeDropdownItemText: '#ededed', // From ThemeDropdown.tsx
      themeDropdownItemTextSelected: '#4c9959', // From ThemeDropdown.tsx
    }
  }
}; 