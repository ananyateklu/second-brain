import { useTheme } from '../contexts/themeContextUtils';
import { themes, ThemeName } from '../theme/theme.config';
import { Sun, Moon, Palette, Eclipse } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if browser is Safari
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
  };

  const getIconColor = (isSelected: boolean) => {
    if (isSelected) return 'text-[#4c9959]';
    return theme === 'light' ? 'text-gray-700' : 'text-gray-200';
  };

  const getThemeIcon = (themeName: ThemeName, isSelected: boolean) => {
    const iconColor = getIconColor(isSelected);

    switch (themeName) {
      case 'light':
        return <Sun className={`w-3.5 h-3.5 ${iconColor}`} />;
      case 'dark':
        return <Moon className={`w-3.5 h-3.5 ${iconColor}`} />;
      case 'midnight':
        return <Palette className={`w-3.5 h-3.5 ${iconColor}`} />;
      case 'full-dark':
        return <Eclipse className={`w-3.5 h-3.5 ${iconColor}`} />;
      default:
        return null;
    }
  };

  const getButtonStyles = (isSelected: boolean, themeName: ThemeName) => {
    const baseStyles = "flex items-center justify-center p-1.5 rounded-md transition-colors duration-200";

    if (isSelected) {
      return `${baseStyles} bg-[#4c9959]/10 text-[#4c9959] ring-1 ring-[#4c9959]/20`;
    }

    if (isSafari) {
      switch (theme) {
        case 'dark':
          return `${baseStyles} text-gray-200 hover:bg-[#323842]`;
        case 'midnight':
          return `${baseStyles} text-gray-200 hover:bg-[#2a3a53]`;
        case 'full-dark':
          return `${baseStyles} text-gray-200 hover:bg-[rgba(25,25,25,0.9)]`;
        default:
          return `${baseStyles} text-gray-700 hover:bg-[#f1f5f9]`;
      }
    }

    const textColor = theme === 'light' ? 'text-gray-700' : 'text-gray-200';

    switch (themeName) {
      case 'midnight':
      case 'dark':
      case 'full-dark':
        return `${baseStyles} ${textColor} hover:bg-[var(--color-secondary)]/30`;
      default:
        return `${baseStyles} ${textColor} hover:bg-[var(--color-secondary)]`;
    }
  };

  if (!mounted) {
    return <div className="w-[120px] h-[32px] bg-[var(--color-secondary)]/30 rounded-lg animate-pulse" />;
  }

  return (
    <div className={`flex gap-1 p-1 rounded-lg transition-colors duration-200 bg-[var(--themeSelectorContainerBackground)] ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'border border-white/10' : ''}`}>
      {Object.keys(themes).map((themeName) => {
        const isSelected = theme === themeName;

        return (
          <button
            key={themeName}
            onClick={() => handleThemeChange(themeName as ThemeName)}
            className={getButtonStyles(isSelected, themeName as ThemeName)}
            title={`Switch to ${themes[themeName as ThemeName].name} theme`}
            data-theme={themeName}
          >
            {getThemeIcon(themeName as ThemeName, isSelected)}
          </button>
        );
      })}
    </div>
  );
} 