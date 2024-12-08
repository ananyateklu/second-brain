import React from 'react';
import { Plus, CheckSquare, Lightbulb, Clock, Edit3, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types/user';
import { Task } from '../../types/task';
import { useTheme } from '../../contexts/themeContextUtils';
import { cardVariants } from '../../utils/welcomeBarUtils';

interface WelcomeSectionProps {
  user: User;
  onNewNote: () => void;
  onNavigate: (path: string) => void;
  stats: {
    totalNotes: number;
    totalTasks: number;
    completedTasks: number;
  };
  tasks: Task[];
}

export const WelcomeSection = React.memo(({ user, onNewNote, onNavigate, stats, tasks }: WelcomeSectionProps) => {
  const { theme } = useTheme();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getIconBg = (type: string) => {
    const baseClass = 'bg-opacity-20 backdrop-blur-sm';
    switch (type) {
      case 'clock':
        return `${baseClass} bg-purple-100 dark:bg-purple-900/30 midnight:bg-purple-900/20`;
      case 'task':
        return `${baseClass} bg-green-100 dark:bg-green-900/30 midnight:bg-green-900/20`;
      case 'note':
        return `${baseClass} bg-blue-100 dark:bg-blue-900/30 midnight:bg-blue-900/20`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-gray-900/30 midnight:bg-gray-900/20`;
    }
  };

  const getIconColor = (type: string) => {
    const baseClass = 'transition-colors duration-200';
    switch (type) {
      case 'clock':
        return `${baseClass} text-purple-600 dark:text-purple-400 midnight:text-purple-300`;
      case 'task':
        return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-300`;
      case 'note':
        return `${baseClass} text-blue-600 dark:text-blue-400 midnight:text-blue-300`;
      default:
        return `${baseClass} text-gray-600 dark:text-gray-400 midnight:text-gray-300`;
    }
  };

  const buttonClasses = {
    note: theme === 'midnight'
      ? 'bg-blue-600/80 hover:bg-blue-500/80 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
      : 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30',
    task: theme === 'midnight'
      ? 'bg-green-600/80 hover:bg-green-500/80 shadow-lg shadow-green-500/20 hover:shadow-green-500/30'
      : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 hover:shadow-green-600/30',
    idea: theme === 'midnight'
      ? 'bg-amber-600/80 hover:bg-amber-500/80 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
      : 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30'
  };

  const getBorderClass = () => 
    theme === 'midnight' 
      ? 'border-[rgb(51,65,85)]/20' 
      : 'border-[var(--color-border)]';

  return (
    <div className={`relative overflow-hidden p-6 border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl rounded-xl shadow-sm transition-all duration-300`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="space-y-6">
          <motion.div 
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <h1 className="text-[var(--color-text)] text-2xl font-bold">
                {getGreeting()},{' '}
                <span className="text-[var(--color-accent)]">
                  {user?.name}
                </span>
              </h1>
              <span className="inline-block animate-wave">👋</span>
            </div>
            <p className="text-[var(--color-textSecondary)]">
              Ready to capture your thoughts and ideas?
            </p>
          </motion.div>
          
          <motion.div 
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2"
          >
            <button
              onClick={onNewNote}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${buttonClasses.note}`}
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">New Note</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/tasks')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${buttonClasses.task}`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="font-medium text-sm">New Task</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/ideas')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${buttonClasses.idea}`}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium text-sm">Capture Idea</span>
            </button>
          </motion.div>
        </div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className={`relative rounded-lg p-4 space-y-3 min-w-[280px] border ${getBorderClass()} bg-[color-mix(in_srgb,var(--color-background)_90%,var(--color-surface))] dark:bg-gray-800/20 backdrop-blur-xl transition-all duration-300`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('clock')} backdrop-blur-xl`}>
              <Clock className={`w-4 h-4 ${getIconColor('clock')}`} />
            </div>
            <span className="text-sm font-medium text-[var(--color-textSecondary)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('task')} backdrop-blur-xl`}>
              <CheckCircle className={`w-4 h-4 ${getIconColor('task')}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {tasks.filter(task => task.status === 'Completed').length} tasks completed
              </span>
              <span className="text-xs text-[var(--color-textSecondary)]">today</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('note')} backdrop-blur-xl`}>
              <Edit3 className={`w-4 h-4 ${getIconColor('note')}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {stats.totalNotes} notes
              </span>
              <span className="text-xs text-[var(--color-textSecondary)]">in your collection</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}); 