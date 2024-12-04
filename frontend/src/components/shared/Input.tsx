import React, { useState } from 'react';
import { LucideIcon, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { promptEnhancementService } from '../../services/ai/promptEnhancementService';
import { RecordButton } from './RecordButton';
import { useTheme } from '../../contexts/themeContextUtils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  className?: string;
  context?: string;
  onEnhanced?: (value: string) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disableEnhancement?: boolean;
  disableRecording?: boolean;
}

export function Input({
  label,
  icon: Icon,
  error,
  className,
  context,
  onEnhanced,
  onChange,
  disableEnhancement = false,
  disableRecording = false,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { theme } = useTheme();

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
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange?.(syntheticEvent);
      onEnhanced?.(enhanced);
      
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleTranscription = (text: string) => {
    if (text && onChange) {
      const syntheticEvent = {
        target: { value: text }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <motion.label 
          htmlFor={props.id} 
          className={`
            block text-sm font-medium
            text-[var(--color-text)]
            transition-colors duration-200
            ${isFocused ? 'text-[var(--color-accent)]' : ''}
          `}
        >
          {label}
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

        <div className="relative flex items-center">
          {Icon && (
            <motion.div 
              className="absolute left-3 flex items-center justify-center pointer-events-none z-10"
              animate={{
                scale: isFocused ? 1.1 : 1,
                x: isFocused ? 2 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`h-5 w-5 ${
                isFocused 
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-textSecondary)]'
              }`} />
            </motion.div>
          )}

          <input
            {...props}
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
              h-10
              px-4
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
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${className}
            `}
          />

          <div className="absolute right-1.5 flex items-center h-full">
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

            {!disableRecording && (
              <div className="border-l border-[var(--color-border)] h-full flex items-center pl-1">
                <RecordButton
                  onTranscription={handleTranscription}
                />
              </div>
            )}
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