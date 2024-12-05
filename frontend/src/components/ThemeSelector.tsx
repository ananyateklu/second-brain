import { useTheme } from '../contexts/themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';
import { Sun, Moon, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Force an immediate update of theme-specific styles
    document.documentElement.setAttribute('data-theme', theme);
    setMounted(true);
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
  };

  const getIconColor = (isSelected: boolean) => {
    if (isSelected) return 'text-[#4c9959]';
    
    // Use current theme state even before mount
    return theme === 'light' ? 'text-gray-700' : 'text-gray-200';
  };

  const getThemeIcon = (themeName: ThemeName, isSelected: boolean) => {
    const iconColor = getIconColor(isSelected);
    
    switch (themeName) {
      case 'light':
        return <Sun className={`w-4 h-4 ${iconColor}`} />;
      case 'dark':
        return <Moon className={`w-4 h-4 ${iconColor}`} />;
      case 'midnight':
        return <Palette className={`w-4 h-4 ${iconColor}`} />;
      default:
        return null;
    }
  };

  const getButtonStyles = (isSelected: boolean, themeName: ThemeName) => {
    const baseStyles = "flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200";
    
    if (isSelected) {
      return `${baseStyles} bg-[#4c9959]/10 text-[#4c9959] ring-2 ring-[#4c9959]/20`;
    }

    // Base text color that ensures readability in all themes
    const textColor = theme === 'light' ? 'text-gray-700' : 'text-gray-200';

    switch (themeName) {
      case 'midnight':
      case 'dark':
        return `${baseStyles} ${textColor} hover:bg-[var(--color-secondary)]/30`;
      default:
        return `${baseStyles} ${textColor} hover:bg-[var(--color-secondary)]`;
    }
  };

  if (!mounted) {
    return <div className="w-[200px] h-[44px] bg-[var(--color-secondary)]/30 rounded-lg animate-pulse" />;
  }

  return (
    <div className="flex gap-2 p-2 bg-[var(--color-secondary)]/30 rounded-lg backdrop-blur-sm transition-colors duration-200">
      {Object.keys(themes).map((themeName) => {
        const currentTheme = themes[themeName as ThemeName];
        const isSelected = theme === themeName;
        
        return (
          <button
            key={themeName}
            onClick={() => handleThemeChange(themeName as ThemeName)}
            className={getButtonStyles(isSelected, themeName as ThemeName)}
            title={`Switch to ${currentTheme.name} theme`}
            data-theme={themeName}
          >
            <span className="transition-colors duration-200">
              {getThemeIcon(themeName as ThemeName, isSelected)}
            </span>
            <span className={`text-sm font-medium transition-colors duration-200 ${isSelected ? 'text-[#4c9959]' : ''}`}>
              {currentTheme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
} 