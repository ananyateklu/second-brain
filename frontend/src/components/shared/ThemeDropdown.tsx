import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette } from 'lucide-react';
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
    
    switch (theme) {
      case 'midnight':
        return `${baseClasses} bg-[rgba(30,41,59,0.8)] hover:bg-[rgba(42,58,83,0.9)] text-[#f1f5f9]`;
      case 'dark':
        return `${baseClasses} bg-[rgba(42,45,53,0.8)] hover:bg-[rgba(50,56,66,0.9)] text-[#f1f5f9]`;
      default:
        return `${baseClasses} bg-[rgba(248,250,252,0.8)] hover:bg-[rgba(241,245,249,0.9)] text-[#1e293b]`;
    }
  };

  const getDropdownClasses = () => {
    const baseClasses = "absolute right-0 mt-2 py-2 w-40 rounded-lg shadow-lg border backdrop-blur-lg z-[9999]";
    
    switch (theme) {
      case 'midnight':
        return `${baseClasses} bg-[rgba(30,41,59,0.95)] border-[rgba(30,41,59,0.6)]`;
      case 'dark':
        return `${baseClasses} bg-[rgba(42,45,53,0.95)] border-[rgba(55,65,81,0.6)]`;
      default:
        return `${baseClasses} bg-[rgba(248,250,252,0.95)] border-[rgba(226,232,240,0.6)]`;
    }
  };

  const getItemClasses = (isSelected: boolean) => {
    const baseClasses = "w-full px-4 py-2 text-left flex items-center gap-2 transition-colors";
    
    if (isSelected) {
      switch (theme) {
        case 'midnight':
          return `${baseClasses} text-[#4c9959] bg-[rgba(42,58,83,0.5)]`;
        case 'dark':
          return `${baseClasses} text-[#4c9959] bg-[rgba(50,56,66,0.5)]`;
        default:
          return `${baseClasses} text-[#4c9959] bg-[rgba(241,245,249,0.5)]`;
      }
    }

    switch (theme) {
      case 'midnight':
        return `${baseClasses} text-[#f1f5f9] hover:bg-[rgba(42,58,83,0.3)]`;
      case 'dark':
        return `${baseClasses} text-[#f1f5f9] hover:bg-[rgba(50,56,66,0.3)]`;
      default:
        return `${baseClasses} text-[#1e293b] hover:bg-[rgba(241,245,249,0.3)]`;
    }
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