import { useTheme } from '../contexts/themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';
import { Sun, Moon, Palette } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: ThemeName) => {
    console.log('Theme Selection:', {
      previousTheme: theme,
      newTheme,
    });
    setTheme(newTheme);
  };

  const getThemeIcon = (themeName: ThemeName) => {
    switch (themeName) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'midnight':
        return <Palette className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-2 p-2 bg-white/10 dark:bg-gray-800/30 rounded-lg backdrop-blur-sm">
      {Object.keys(themes).map((themeName) => {
        const currentTheme = themes[themeName as ThemeName];
        
        return (
          <button
            key={themeName}
            onClick={() => handleThemeChange(themeName as ThemeName)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
              theme === themeName 
                ? 'bg-primary-500/10 text-primary-500 dark:text-primary-400 ring-2 ring-primary-500/20'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
            }`}
            title={`Switch to ${currentTheme.name} theme`}
            data-theme={themeName}
          >
            {getThemeIcon(themeName as ThemeName)}
            <span className="text-sm font-medium">{currentTheme.name}</span>
          </button>
        )
      })}
    </div>
  );
} 