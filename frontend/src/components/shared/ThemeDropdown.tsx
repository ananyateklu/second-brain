import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';
import { ThemeName } from '../../theme/theme.config';

interface ThemeOption {
  name: ThemeName;
  label: string;
  icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { name: 'light', label: 'Light', icon: Sun },
  { name: 'dark', label: 'Dark', icon: Moon },
  { name: 'midnight', label: 'Midnight', icon: Palette },
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
    }, 300); // Small delay to make it feel smoother
  };

  const getCurrentThemeIcon = () => {
    const currentTheme = themeOptions.find(option => option.name === theme);
    const Icon = currentTheme?.icon || Sun;
    return <Icon className="w-5 h-5" />;
  };

  const getDropdownClasses = () => {
    switch (theme) {
      case 'midnight':
        return 'bg-gray-800/40 hover:bg-gray-800/60 text-white';
      case 'dark':
        return 'bg-gray-800/30 hover:bg-gray-800/50 text-white';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    }
  };

  const getMenuClasses = () => {
    switch (theme) {
      case 'midnight':
        return 'bg-gray-900/90 border-gray-700/50';
      case 'dark':
        return 'bg-gray-800/90 border-gray-700/50';
      default:
        return 'bg-white border-gray-200 shadow-lg';
    }
  };

  const getItemClasses = (isSelected: boolean) => {
    if (isSelected) {
      switch (theme) {
        case 'midnight':
          return 'text-primary-400 bg-white/5';
        case 'dark':
          return 'text-primary-400 bg-white/5';
        default:
          return 'text-primary-600 bg-gray-100';
      }
    }
    
    switch (theme) {
      case 'midnight':
      case 'dark':
        return 'text-white/90 hover:bg-white/10';
      default:
        return 'text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <div 
      className="relative z-[9999]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`p-2 rounded-full ${getDropdownClasses()} transition-all duration-200 backdrop-blur-sm`}
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
            className={`absolute right-0 mt-2 py-2 w-40 rounded-lg shadow-lg border backdrop-blur-lg z-[9999] ${getMenuClasses()}`}
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => {
                    setTheme(option.name);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 transition-colors ${getItemClasses(theme === option.name)}`}
                >
                  <Icon className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-current'}`} />
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