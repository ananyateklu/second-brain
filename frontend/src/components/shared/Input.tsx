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
  requiredIndicatorColor?: string;
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
  requiredIndicatorColor,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { theme, colors } = useTheme();

  // Get validation border color
  const validationColor = error ? (requiredIndicatorColor ?? 'rgb(239, 68, 68)') : undefined;

  const getBackgroundColor = () => {
    switch (theme) {
      case 'dark':
        return 'rgba(42, 45, 53, 0.7)';  // Increased opacity
      case 'midnight':
        return 'rgba(30, 41, 59, 0.7)';  // Increased opacity
      default:
        return 'rgba(248, 250, 252, 0.95)';
    }
  };

  const getHoverBackgroundColor = () => {
    switch (theme) {
      case 'dark':
        return 'rgba(50, 56, 66, 0.5)';  // Slightly more visible on hover
      case 'midnight':
        return 'rgba(42, 58, 83, 0.5)';  // Slightly more visible on hover
      default:
        return 'rgba(248, 250, 252, 1)';
    }
  };

  const getBorderColor = () => {
    switch (theme) {
      case 'dark':
        return 'rgba(100, 116, 139, 0.5)';  // Lighter slate color with higher opacity
      case 'midnight':
        return 'rgba(100, 116, 139, 0.5)';  // Lighter slate color with higher opacity
      default:
        return 'rgba(148, 163, 184, 0.8)';  // Darker border for light mode with higher opacity
    }
  };

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
          className="absolute inset-0 rounded-lg -z-10"
          style={{
            backgroundColor: getBackgroundColor()
          }}
          animate={{
            scale: isFocused ? 1.01 : 1,
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
            style={{
              borderColor: validationColor || getBorderColor(),
              backgroundColor: getBackgroundColor(),
              ...props.style
            }}
            className={`
              w-full
              h-10
              px-4
              mx-0.5
              ${typeof Icon !== 'undefined' ? 'pl-10' : ''}
              ${props.value ? 'pr-10' : ''}
              rounded-lg
              border
              text-[var(--color-text)]
              placeholder:text-[var(--color-textSecondary)]
              focus:text-[var(--color-text)]
              focus:outline-none
              focus:ring-2
              ${error ? `focus:ring-[${validationColor}]/50` : 'focus:ring-[var(--color-accent)]/50'}
              focus:border-[var(--color-accent)]/60
              transition-all
              duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              hover:border-[var(--color-accent)]/50
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
                  style={{
                    backgroundColor: isFocused ? getHoverBackgroundColor() : getBackgroundColor()
                  }}
                  className={`
                    flex
                    items-center
                    justify-center
                    w-6
                    h-6
                    mr-3
                    rounded-md
                    text-[var(--color-textSecondary)]
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
              <div 
                className="h-full flex items-center pl-1"
                style={{
                  borderLeft: `0.5px solid ${getBorderColor()}`
                }}
              >
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