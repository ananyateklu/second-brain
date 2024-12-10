import React from 'react';
import { Plus, CheckSquare, Lightbulb, Clock, Edit3, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../../types/user';
import { Task } from '../../types/task';
import { useTheme } from '../../contexts/themeContextUtils';
import { cardVariants, sizeClasses } from '../../utils/welcomeBarUtils';

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

const getContainerBackground = (theme: string) => {
  if (theme === 'dark') return 'bg-gray-900/30'
  if (theme === 'midnight') return 'bg-[#1e293b]/30'
  return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]'
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
    switch (type) {
      case 'clock':
        return 'bg-purple-100/20 dark:bg-purple-900/20 midnight:bg-purple-900/20';
      case 'task':
        return 'bg-green-100/20 dark:bg-green-900/20 midnight:bg-green-900/20';
      case 'note':
        return 'bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20';
      default:
        return 'bg-gray-100/20 dark:bg-gray-900/20 midnight:bg-gray-900/20';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'clock':
        return 'text-purple-600 dark:text-purple-400 midnight:text-purple-300';
      case 'task':
        return 'text-green-600 dark:text-green-400 midnight:text-green-300';
      case 'note':
        return 'text-blue-600 dark:text-blue-400 midnight:text-blue-300';
      default:
        return 'text-gray-600 dark:text-gray-400 midnight:text-gray-300';
    }
  };

  const buttonClasses = {
    note: theme === 'midnight'
      ? 'bg-blue-600/80 hover:bg-blue-500/80'
      : 'bg-primary-600 hover:bg-primary-700',
    task: theme === 'midnight'
      ? 'bg-green-600/80 hover:bg-green-500/80'
      : 'bg-green-600 hover:bg-green-700',
    idea: theme === 'midnight'
      ? 'bg-amber-600/80 hover:bg-amber-500/80'
      : 'bg-amber-600 hover:bg-amber-700'
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={`
        relative 
        overflow-hidden 
        rounded-2xl 
        ${getContainerBackground(theme)}
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
        transition-all 
        duration-300 
        p-6
        mb-6
        w-full
      `}
    >
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-6">
          <motion.div 
            variants={cardVariants}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
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
          className={`
            relative 
            rounded-lg 
            p-4 
            space-y-3 
            min-w-[280px]
            ${getContainerBackground(theme)}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('clock')} backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10`}>
              <Clock className={`${sizeClasses.medium.iconSize} ${getIconColor('clock')}`} />
            </div>
            <span className={`${sizeClasses.medium.titleSize} font-medium text-[var(--color-textSecondary)]`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('task')} backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10`}>
              <CheckCircle className={`${sizeClasses.medium.iconSize} ${getIconColor('task')}`} />
            </div>
            <div className="flex flex-col">
              <span className={`${sizeClasses.medium.valueSize} font-semibold text-[var(--color-text)]`}>
                {tasks.filter(task => task.status === 'Completed').length} tasks completed
              </span>
              <span className="text-xs text-[var(--color-textSecondary)]">today</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getIconBg('note')} backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10`}>
              <Edit3 className={`${sizeClasses.medium.iconSize} ${getIconColor('note')}`} />
            </div>
            <div className="flex flex-col">
              <span className={`${sizeClasses.medium.valueSize} font-semibold text-[var(--color-text)]`}>
                {stats.totalNotes} notes
              </span>
              <span className="text-xs text-[var(--color-textSecondary)]">in your collection</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}); 