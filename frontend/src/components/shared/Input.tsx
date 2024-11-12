import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { textStyles } from '../../utils/textUtils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
  className?: string;
}

export function Input({
  label,
  icon: Icon,
  error,
  className,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="space-y-1">
      {label && (
        <motion.label 
          htmlFor={props.id} 
          className={`
            block text-sm font-medium
            text-gray-900 dark:text-gray-100
            transition-colors duration-200
            ${isFocused ? 'text-gray-900 dark:text-primary-400' : ''}
          `}
        >
          {label}
        </motion.label>
      )}
      
      <div className="relative">
        <motion.div
          className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg -z-10"
          animate={{
            scale: isFocused ? 1.02 : 1,
            opacity: isFocused ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
        />

        <div className="relative">
          {Icon && (
            <motion.div 
              className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10"
              animate={{
                scale: isFocused ? 1.1 : 1,
                x: isFocused ? 2 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`h-5 w-5 ${
                isFocused 
                  ? 'text-gray-700 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
            </motion.div>
          )}

          <input
            {...props}
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
              px-4 py-2
              ${Icon ? 'pl-10' : ''}
              backdrop-blur-glass
              bg-white/70 dark:bg-gray-800/70
              rounded-lg
              border border-gray-200/50 dark:border-gray-700/50
              text-gray-900 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:text-gray-900 dark:focus:text-primary-300
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500/30
              focus:border-transparent
              transition-all
              duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${className}
            `}
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p 
            className="text-sm text-red-500 dark:text-red-400"
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