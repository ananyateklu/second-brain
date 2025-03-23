import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/themeContextUtils';

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  requiredIndicatorColor?: string;
}

export function TextArea({
  label,
  icon: Icon,
  error,
  className,
  onChange,
  rows = 6,
  requiredIndicatorColor,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colors, theme } = useTheme();

  // Get validation border color
  const validationColor = error ? (requiredIndicatorColor ?? 'rgb(239, 68, 68)') : undefined;

  // Get background color based on theme
  const getBackgroundColor = () => {
    if (theme === 'dark') return '#111827';
    if (theme === 'midnight') return '#1e293b';
    return colors.surface; // Use surface color for light theme
  };

  // Get border color based on theme
  const getBorderColor = () => {
    if (theme === 'midnight') return 'rgba(255, 255, 255, 0.05)';
    if (theme === 'dark') return 'rgba(75, 85, 99, 0.3)'; // Less visible gray for dark mode
    return 'var(--color-border)';
  };

  return (
    <div className="space-y-2">
      {label && (
        <motion.label
          htmlFor={props.id}
          style={{
            color: isFocused ? colors.accent : colors.textSecondary,
          }}
          className="block text-sm font-medium transition-colors duration-200"
        >
          {label}
          {props.required && (
            <span
              style={{ color: requiredIndicatorColor ?? colors.accent }}
              className="ml-1"
            >
              *
            </span>
          )}
        </motion.label>
      )}

      <div className="relative">
        <div className="relative">
          {Icon && (
            <motion.div
              className="absolute left-3 top-3 flex items-center justify-center pointer-events-none z-10"
              animate={{
                scale: isFocused ? 1.1 : 1,
                x: isFocused ? 2 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              <Icon
                style={{
                  color: isFocused ? colors.accent : colors.textSecondary,
                }}
                className="h-5 w-5 transition-colors duration-200"
              />
            </motion.div>
          )}

          <textarea
            {...props}
            rows={rows}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            style={{
              backgroundColor: getBackgroundColor(),
              borderColor: error ? validationColor : getBorderColor(),
              ...props.style
            }}
            className={`
              w-full
              min-h-[120px]
              px-3
              py-2
              ${typeof Icon !== 'undefined' ? 'pl-10' : ''}
              border
              rounded-lg
              text-[var(--color-text)]
              placeholder:text-[var(--color-textSecondary)]
              focus:text-[var(--color-text)]
              focus:outline-none
              focus:ring-2
              focus:ring-[var(--color-accent)]/50
              focus:border-transparent
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
              resize-none
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${className}
            `}
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            style={{ color: validationColor }}
            className="text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
} 