import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette, Eclipse } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';
import { ThemeName } from '../../theme/themeConfig.types';

interface ThemeOption {
  name: ThemeName;
  label: string;
  icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { name: 'light', label: 'Light', icon: Sun },
  { name: 'dark', label: 'Dark', icon: Moon },
  { name: 'midnight', label: 'Midnight', icon: Palette },
  { name: 'full-dark', label: 'Full Dark', icon: Eclipse },
];

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const getCurrentThemeIcon = () => {
    const currentTheme = themeOptions.find(option => option.name === theme);
    const Icon = currentTheme?.icon || Sun;
    return <Icon className="w-5 h-5" />;
  };

  const getButtonClasses = () => {
    const baseClasses = "p-2 rounded-full transition-all duration-200 backdrop-blur-sm";
    return `${baseClasses} bg-[var(--themeDropdownButtonBackground)] hover:bg-[var(--themeDropdownButtonBackgroundHover)] text-[var(--color-text)]`;
  };

  const getDropdownClasses = () => {
    const baseClasses = "absolute right-0 mt-2 py-2 w-40 rounded-lg shadow-lg border backdrop-blur-lg z-[9999]";
    return `${baseClasses} bg-[var(--themeDropdownBackground)] border-[var(--themeDropdownBorder)]`;
  };

  const getItemClasses = (isSelected: boolean) => {
    const baseClasses = "w-full px-4 py-2 text-left flex items-center gap-2 transition-colors";

    if (isSelected) {
      return `${baseClasses} text-[var(--themeDropdownItemTextSelected)] bg-[var(--themeDropdownItemBackgroundSelected)]`;
    }

    return `${baseClasses} text-[var(--themeDropdownItemText)] hover:bg-[var(--themeDropdownItemBackgroundHover)]`;
  };

  return (
    <div
      className="relative z-[9999]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={getButtonClasses()}
        aria-label="Change theme"
        aria-expanded={isOpen}
      >
        {getCurrentThemeIcon()}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={getDropdownClasses()}
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.name;

              return (
                <button
                  key={option.name}
                  onClick={() => {
                    setTheme(option.name);
                    setIsOpen(false);
                  }}
                  className={getItemClasses(isSelected)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 