export type ThemeName = 'light' | 'dark' | 'midnight' | 'full-dark';

export interface ThemeColor {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  // Semantic colors
  note: string;
  idea: string;
  task: string;
  reminder: string;
  tag: string;
  // Additional UI colors
  surfaceHover: string;
  surfaceActive: string;
  divider: string;
  focus: string;
  gradientBackground: string;
  // RGB values
  'surface-rgb': string;
  'text-rgb': string;
  'border-rgb': string;

  // New Semantic Colors for specific components/areas
  sidebarBackground: string;
  headerBackground: string;
  welcomeBarBackground: string;
  dashboardHomeBackground: string;
  chatInterfaceBackground: string;
  conversationHistoryBackground: string;
  statsEditorBackground: string;
  statsEditorBorder: string;
  activityItemBorder: string;
  activityItemBorderHover: string;
  themeSelectorContainerBackground: string;
  themeSelectorButtonBackground: string;
  themeSelectorButtonBackgroundHover: string;
  themeSelectorButtonBackgroundSelected: string;
  themeSelectorButtonText: string;
  themeSelectorButtonTextSelected: string;
  themeDropdownButtonBackground: string;
  themeDropdownButtonBackgroundHover: string;
  themeDropdownBackground: string;
  themeDropdownBorder: string;
  themeDropdownItemBackground: string;
  themeDropdownItemBackgroundHover: string;
  themeDropdownItemBackgroundSelected: string;
  themeDropdownItemText: string;
  themeDropdownItemTextSelected: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColor;
} 