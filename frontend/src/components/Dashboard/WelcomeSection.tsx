import React from 'react';
import { Plus, CheckSquare, Lightbulb, BellRing, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types/user';
import { Task } from '../../types/task';
import { useTheme } from '../../contexts/themeContextUtils';

interface WelcomeSectionProps {
  user: User;
  onNewNote: () => void;
  onNavigate: (path: string) => void;
  stats: {
    totalNotes: number;
    totalTasks: number;
    completedTasks: number;
    totalReminders?: number;
  };
  tasks: Task[];
}

const getUserNameColor = () => {
  return 'text-primary-500';
}

export const WelcomeSection = React.memo(({ user, onNewNote, onNavigate }: WelcomeSectionProps) => {
  const { theme } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const buttonClasses = {
    note: theme === 'midnight'
      ? 'bg-blue-600/70 hover:bg-blue-700/80'
      : 'bg-blue-600/70 hover:bg-blue-700/80',
    task: theme === 'midnight'
      ? 'bg-primary-500/80 hover:bg-primary-400/80'
      : 'bg-primary-500/80 hover:bg-primary-600/90',
    idea: theme === 'midnight'
      ? 'bg-amber-600/70 hover:bg-amber-500/80'
      : 'bg-amber-600/70 hover:bg-amber-700/80',
    reminder: theme === 'midnight'
      ? 'bg-purple-400/70 hover:bg-purple-500/80'
      : 'bg-purple-400/70 hover:bg-purple-500/70'
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`
        relative 
        overflow-hidden 
        rounded-xl
        bg-[var(--welcomeBarBackground)]
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[0px_8px_30px_-2px_rgba(0,0,0,0.12),0px_8px_24px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[0px_8px_30px_-2px_rgba(0,0,0,0.3),0px_8px_24px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
        transition-all 
        duration-300 
        px-5
        py-6
        w-full
        z-10
      `}
    >
      {/* Background decoration elements - made smaller */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl"></div>

      <div className="relative">
        <div className="space-y-2">
          <motion.div
            variants={itemVariants}
            className="space-y-0.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {getGreeting()},{' '}
                <span className={`${getUserNameColor()} inline-flex items-center`}>
                  {user?.name}
                  <motion.span
                    className="ml-1 inline-block"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 15, 0, 15, 0] }}
                    transition={{ duration: 1.5, delay: 0.5, repeat: 0, repeatDelay: 8 }}
                  >
                    👋
                  </motion.span>
                </span>
              </h1>
              <motion.div
                className="flex items-center gap-1 bg-[var(--color-surface)] py-0.5 px-2 rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <Calendar className="w-3 h-3 text-[var(--color-accent)]" />
                <span className="text-xs font-medium text-[var(--color-textSecondary)]">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </motion.div>
            </div>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Ready to capture your thoughts and ideas?
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap gap-1.5"
          >
            <motion.button
              whileHover={{ y: -2, boxShadow: "0 8px 15px -4px rgba(59, 130, 246, 0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onNewNote}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white rounded-lg transition-all duration-200 ${buttonClasses.note}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">New Note</span>
            </motion.button>
            <motion.button
              whileHover={{ y: -2, boxShadow: "0 8px 15px -4px rgba(22, 163, 74, 0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('/dashboard/tasks')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white rounded-lg transition-all duration-200 ${buttonClasses.task}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">New Task</span>
            </motion.button>
            <motion.button
              whileHover={{ y: -2, boxShadow: "0 8px 15px -4px rgba(245, 158, 11, 0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('/dashboard/ideas')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white rounded-lg transition-all duration-200 ${buttonClasses.idea}`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">Capture Idea</span>
            </motion.button>
            <motion.button
              whileHover={{ y: -2, boxShadow: "0 8px 15px -4px rgba(147, 51, 234, 0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('/dashboard/reminders')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white rounded-lg transition-all duration-200 ${buttonClasses.reminder}`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span className="font-medium text-xs">Set Reminder</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});