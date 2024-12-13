import { motion, Variants } from 'framer-motion';
import { Logo } from './Logo';
import { Moon, Sun, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';

interface LoadingScreenProps {
  message?: string;
  variant?: 'default' | 'notes';
}

const LOADING_DOTS = ['dot1', 'dot2', 'dot3'] as const;
const DOT_DELAYS = { dot1: 0, dot2: 0.2, dot3: 0.4 } as const;

const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

const dotVariants: Variants = {
  hidden: { scale: 0 },
  visible: (delay: number) => ({
    scale: [0, 1, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }
  })
};

export function LoadingScreen({ message = 'Loading...', variant = 'default' }: LoadingScreenProps) {
  const { theme, toggleTheme, colors } = useTheme();

  const renderLoadingDots = (className: string) => (
    <div className="flex justify-center space-x-2">
      {LOADING_DOTS.map((id) => (
        <motion.div
          key={id}
          custom={DOT_DELAYS[id]}
          variants={dotVariants}
          initial="hidden"
          animate="visible"
          className={`w-2 h-2 rounded-full ${className}`}
        />
      ))}
    </div>
  );

  const renderContent = () => {
    if (variant === 'notes') {
      return (
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-6"
        >
          <motion.div
            variants={scaleVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-center items-center"
          >
            <div className="p-4 bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20 rounded-xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 midnight:text-blue-300" />
            </div>
          </motion.div>

          <motion.div
            variants={fadeInVariants}
            initial="hidden"
            animate="visible"
            className="text-[var(--color-text)] font-medium text-lg"
          >
            {message}
          </motion.div>

          {renderLoadingDots('bg-blue-500/50')}
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="text-center space-y-4"
      >
        <motion.div
          variants={scaleVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-center items-center"
        >
          <Logo className="w-auto h-12" />
        </motion.div>

        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="text-[var(--color-text)] font-medium text-base"
        >
          {message}
        </motion.div>

        {renderLoadingDots('bg-[var(--color-text)]/90')}
      </motion.div>
    );
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
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
        variants={scaleVariants}
        initial="hidden"
        animate="visible"
        className={`
          bg-white/10 
          dark:bg-black/10 
          midnight:bg-black/20 
          rounded-xl 
          p-8
          border-[0.5px]
          border-white/10
          dark:border-white/5
          midnight:border-white/[0.02]
          backdrop-blur-xl
          shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2),0_4px_12px_-6px_rgba(0,0,0,0.1)]
          dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5),0_4px_12px_-6px_rgba(0,0,0,0.3)]
          midnight:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.9),0_4px_12px_-6px_rgba(0,0,0,0.6)]
          transition-all 
          duration-200
        `}
      >
        {renderContent()}
      </motion.div>
    </motion.div>
  );
}