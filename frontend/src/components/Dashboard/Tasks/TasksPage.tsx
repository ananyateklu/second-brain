import { useState } from 'react';
import { CheckSquare, Plus, Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { NewTaskModal } from './NewTaskModal';
import { TaskFilters } from './TaskFilters';
import { Input } from '../../shared/Input';
import { TaskCard } from './TaskCard';
import { EditTaskModal } from './EditTaskModal';
import { Task } from '../../../api/types/task';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';

export function TasksPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tasks } = useTasks();
  const { theme } = useTheme();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    dueDate: 'all'
  });

  const completedTasks = tasks.filter((task: Task) => task && task.status === 'Completed').length;
  const selectedTask = selectedTaskId ? tasks.find((t: Task) => t.id === selectedTaskId) : null;

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getViewModeButtonClass = (mode: 'grid' | 'list', currentMode: string) => {
    const baseClasses = `
      p-2 rounded-lg 
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
    `;

    if (currentMode === mode) {
      return `${baseClasses} bg-green-500/20 text-green-600 dark:text-green-400 midnight:text-green-300`;
    }

    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const renderTaskContent = () => {
    if (tasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <CheckSquare className="w-16 h-16 text-green-400/50 dark:text-green-500/30 mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
            No tasks found
          </h3>
          <p className="text-[var(--color-textSecondary)] max-w-md">
            {searchQuery || Object.values(filters).some(v => v !== 'all')
              ? "Try adjusting your filters to find what you're looking for."
              : "Start organizing your tasks! Click the 'New Task' button to create your first task."}
          </p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className={cardGridStyles}>
          {tasks.map((task: Task) => (
            <TaskCard 
              key={task.id}
              task={task} 
              viewMode="grid"
              onClick={handleTaskClick}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4 px-0.5">
        {tasks.map((task: Task) => (
          <TaskCard 
            key={task.id}
            task={task} 
            viewMode="list"
            onClick={handleTaskClick}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="px-6 space-y-8 relative">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
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
            p-6
          `}
        >
          <div className="flex flex-col sm:flex-row gap-6 justify-between">
            <motion.div 
              variants={cardVariants}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-green-100/20 dark:bg-green-900/20 midnight:bg-green-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400 midnight:text-green-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Tasks</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {completedTasks} of {tasks.length} tasks completed
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className={`
                  flex items-center gap-2 px-4 py-2 
                  ${theme === 'midnight' ? 'bg-green-600/80 hover:bg-green-500/80' : 'bg-green-600 hover:bg-green-700'}
                  text-white rounded-lg transition-all duration-200 
                  hover:scale-105 hover:-translate-y-0.5 
                  shadow-sm hover:shadow-md
                `}
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">New Task</span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and View Controls */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <motion.div 
            variants={cardVariants}
            className="flex gap-2"
          >
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg 
                border-[0.5px] border-white/10
                ${getContainerBackground()}
                backdrop-blur-xl 
                ring-1 ring-white/5
                hover:bg-[var(--color-surfaceHover)]
                text-[var(--color-text)]
                transition-all duration-200
                hover:-translate-y-0.5
                shadow-sm hover:shadow-md
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-medium text-sm">Filters</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={getViewModeButtonClass('grid', viewMode)}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={getViewModeButtonClass('list', viewMode)}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              p-6
              rounded-2xl
              border-[0.5px] 
              border-white/10
              ${getContainerBackground()}
              backdrop-blur-xl 
              ring-1 ring-white/5
              shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
              dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
              transition-all 
              duration-300
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100/20 dark:bg-green-900/20 midnight:bg-green-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-green-600 dark:text-green-400 midnight:text-green-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={() => setFilters({ status: 'all', priority: 'all', dueDate: 'all' })}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>

            <TaskFilters
              filters={filters}
              onFilterChange={(key, value) =>
                setFilters(prev => ({ ...prev, [key]: value }))
              }
            />
          </motion.div>
        )}

        {/* Tasks Content */}
        <motion.div
          variants={cardVariants}
          className={`
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
            p-6
            min-h-[500px]
          `}
        >
          {renderTaskContent()}
        </motion.div>

        {/* Modals */}
        {selectedTask && (
          <EditTaskModal
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            task={selectedTask}
          />
        )}

        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
        />
      </div>
    </div>
  );
}