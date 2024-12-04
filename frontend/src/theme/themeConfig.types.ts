export type ThemeColor = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
};

export type ThemeConfig = {
  name: string;
  colors: ThemeColor;
};

export type ThemeName = 'light' | 'dark' | 'blue' | 'purple' | 'green'; 