import { create } from 'zustand';
import { resetDashboardColorCache } from '../pages/DashboardPage';

type Theme = 'light' | 'dark' | 'blue';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'second-brain-theme';

// Load theme from localStorage
const loadTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'blue') {
    return stored;
  }
  return 'light';
};

// Save theme to localStorage
const saveTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

// Initialize theme from storage
const initialTheme = loadTheme();

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  
  setTheme: (theme: Theme) => {
    set({ theme });
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also manage the 'dark' class for Tailwind's dark mode
    // Both 'dark' and 'blue' themes use dark mode styling
    if (theme === 'dark' || theme === 'blue') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Reset dashboard color cache when theme changes
    resetDashboardColorCache();
  },
  
  toggleTheme: () => {
    const currentTheme = get().theme;
    // Cycle through: light -> dark -> blue -> light
    const themeOrder: Theme[] = ['light', 'dark', 'blue'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    get().setTheme(newTheme);
  },
}));

// Apply initial theme on load
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme);
  if (initialTheme === 'dark' || initialTheme === 'blue') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

