export type ThemeName = 'light' | 'dark' | 'midnight';

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
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColor;
} 