import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 ${colors.gradientBackground} flex items-center justify-center backdrop-blur-sm z-50 transition-colors duration-200`}
    >
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-lg bg-[var(--color-surface)]/90 border border-[var(--color-border)] shadow-lg transition-all duration-200 hover:scale-105"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-[var(--color-idea)]" />
        ) : (
          <Moon className="w-5 h-5 text-[var(--color-text)]" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${colors.gradientPanel} rounded-xl p-8 shadow-lg border border-[var(--color-border)]/20 backdrop-blur-sm transition-colors duration-200`}
      >
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          {/* Logo Container */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="flex justify-center items-center"
          >
            <Logo className="w-auto h-12" variant="dark" />
          </motion.div>

          {/* Loading Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white font-medium text-base transition-colors duration-200"
          >
            {message}
          </motion.div>

          {/* Loading Indicator */}
          <div className="flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 bg-white/90 rounded-full transition-colors duration-200"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}