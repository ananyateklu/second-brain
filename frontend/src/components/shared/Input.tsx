import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.label 
        htmlFor={props.id} 
        className="block text-sm font-medium text-white"
        animate={{
          scale: isFocused ? 1.05 : 1,
          color: isFocused ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.9)'
        }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.label>
      
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-white/5 rounded-lg -z-10"
          animate={{
            scale: isFocused ? 1.02 : 1,
            opacity: isFocused ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
        />

        {Icon && (
          <motion.div 
            className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
            animate={{
              scale: isFocused ? 1.1 : 1,
              x: isFocused ? 2 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
        )}

        <motion.div
          className="relative"
          animate={{
            y: isFocused ? -1 : 0
          }}
          transition={{ duration: 0.2 }}
        >
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
              rounded-lg
              border
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500/50
              transition-all
              duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:border-red-500' : 'border-white/20'}
              ${className}
            `}
          />
        </motion.div>

        <AnimatePresence>
          {isFocused && (
            <motion.div
              className="absolute inset-0 border-2 border-white/20 rounded-lg pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p 
            className="text-sm text-red-400 mt-1 flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}