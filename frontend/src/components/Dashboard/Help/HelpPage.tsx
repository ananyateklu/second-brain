import { HelpCircle, Book, Keyboard, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';

export function HelpPage() {
  const { theme } = useTheme();

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const cardClasses = `
    relative 
    overflow-hidden 
    rounded-2xl 
    ${getContainerBackground()}
    backdrop-blur-xl 
    border-[0.5px] 
    border-white/10
    shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
    dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
    ring-1
    ring-white/5
    transition-all 
    duration-300
    hover:bg-[var(--color-surfaceHover)]
  `;

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="px-6 space-y-8 relative">
        {/* Page Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={cardClasses}
        >
          <div className="p-8">
            <motion.div 
              variants={cardVariants}
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <HelpCircle className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Help & Support</h1>
                <p className="mt-1 text-base text-[var(--color-textSecondary)]">
                  Get help and learn how to use all features effectively
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Content Sections */}
        <motion.div
          variants={cardVariants}
          className={cardClasses}
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Book className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Getting Started</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Learn the basics of using Second Brain
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Quick Start Guide</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Get up and running with Second Brain in minutes
                </p>
              </div>
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Basic Features</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Learn about the core features and how to use them
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Keyboard Shortcuts Section */}
        <motion.div
          variants={cardVariants}
          className={cardClasses}
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Keyboard className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Keyboard Shortcuts</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Master Second Brain with keyboard shortcuts
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Navigation</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Learn how to quickly navigate through your notes
                </p>
              </div>
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Editor Commands</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Discover powerful editor shortcuts and commands
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          variants={cardVariants}
          className={cardClasses}
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">FAQ</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Find answers to common questions
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Account & Settings</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Questions about your account and preferences
                </p>
              </div>
              <div className={`p-4 ${getContainerBackground()} rounded-xl border-[0.5px] border-white/10 hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}>
                <h3 className="font-medium text-[var(--color-text)]">Troubleshooting</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Solutions to common issues and problems
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}