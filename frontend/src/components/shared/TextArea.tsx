import React, { useState } from 'react';
import { LucideIcon, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { promptEnhancementService } from '../../services/ai/promptEnhancementService';
import { useTheme } from '../../contexts/themeContextUtils';

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  className?: string;
  context?: string;
  onEnhanced?: (value: string) => void;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disableEnhancement?: boolean;
  requiredIndicatorColor?: string;
}

export function TextArea({
  label,
  icon: Icon,
  error,
  className,
  context,
  onEnhanced,
  onChange,
  disableEnhancement = false,
  rows = 6,
  requiredIndicatorColor,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { theme, colors } = useTheme();

  const handleEnhancePrompt = async () => {
    if (!props.value || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const enhanced = await promptEnhancementService.enhancePrompt(
        props.value as string,
        context
      );
      
      const syntheticEvent = {
        target: { value: enhanced }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onChange?.(syntheticEvent);
      onEnhanced?.(enhanced);
      
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
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
        <motion.div
          className={`absolute inset-0 backdrop-blur-sm rounded-lg -z-10 ${
            theme === 'midnight'
              ? 'bg-[rgb(17,24,39)]/80'
              : 'bg-[var(--color-surface)]/50'
          }`}
          animate={{
            scale: isFocused ? 1.02 : 1,
            opacity: isFocused ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
        />

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
            className={`
              w-full
              px-4
              py-3
              mx-0.5
              ${typeof Icon !== 'undefined' ? 'pl-10' : ''}
              ${props.value ? 'pr-10' : ''}
              backdrop-blur-glass
              ${theme === 'midnight' 
                ? 'bg-[rgb(17,24,39)]/80 hover:bg-[rgb(17,24,39)]/90' 
                : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/90'
              }
              rounded-lg
              border border-[var(--color-border)]
              text-[var(--color-text)]
              placeholder:text-[var(--color-textSecondary)]
              focus:text-[var(--color-text)]
              focus:outline-none
              focus:ring-2
              focus:ring-[var(--color-accent)]/30
              focus:border-transparent
              transition-all
              duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              resize-none
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${className}
            `}
          />

          <div className="absolute right-1.5 top-3">
            <AnimatePresence>
              {props.value && !disableEnhancement && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className={`
                    flex
                    items-center
                    justify-center
                    w-6
                    h-6
                    mr-3
                    rounded-md
                    text-[var(--color-textSecondary)]
                    ${theme === 'midnight'
                      ? 'hover:bg-[rgb(17,24,39)]/90'
                      : 'hover:bg-[var(--color-surface)]/80'
                    }
                    hover:text-[var(--color-accent)]
                    disabled:opacity-50 
                    disabled:cursor-not-allowed
                    transition-all 
                    duration-200
                  `}
                >
                  <Wand2 
                    className={`h-4 w-4 ${
                      isEnhancing 
                        ? 'animate-spin-slow transition-transform duration-700' 
                        : 'transition-transform duration-200'
                    }`} 
                  />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p 
            className="text-sm text-red-500"
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