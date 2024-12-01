import React from 'react';
import { Plus, CheckSquare, Lightbulb, Clock, Edit3, CheckCircle } from 'lucide-react';
import { User } from '../../types/user';
import { Task } from '../../types/task';
import { textStyles } from '../../utils/textUtils';

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
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="relative overflow-hidden">
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className={textStyles.h1}>
                {getGreeting()},{' '}
                <span className="text-primary-600 dark:text-primary-400">
                  {user?.name}
                </span>
              </h1>
              <span className="inline-block animate-wave">👋</span>
            </div>
            <p className={textStyles.bodySmall}>
              Ready to capture your thoughts and ideas?
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onNewNote}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">New Note</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/tasks')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:-translate-y-0.5"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="font-medium text-sm">New Task</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/ideas')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 hover:-translate-y-0.5"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium text-sm">Capture Idea</span>
            </button>
          </div>
        </div>

        <div className="relative bg-white/10 dark:bg-[#2C2C2E] rounded-lg p-3 space-y-2 min-w-[260px] border border-gray-200/30 dark:border-[#3C3C3E]/30">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-gray-100/50 dark:bg-[#3C3C3E]/30 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-green-100/50 dark:bg-green-500/10 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-green-600 dark:text-green-500">
                {tasks.filter(task => task.status === 'Completed').length}
              </span>
              <span className="ml-1 text-sm">tasks completed today</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-blue-100/50 dark:bg-blue-500/10 rounded-lg">
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-500">
                {stats.totalNotes}
              </span>
              <span className="ml-1 text-sm">total notes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}); 