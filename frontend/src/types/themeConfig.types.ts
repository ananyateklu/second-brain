export interface ThemeColors {
  note: string;
  idea: string;
  task: string;
  reminder: string;
  tag: string;
}

export interface ThemeConfig {
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
} 