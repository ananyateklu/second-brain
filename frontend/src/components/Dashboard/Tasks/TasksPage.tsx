import { useState } from 'react';
import { CheckSquare, Plus, Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { NewTaskModal } from './NewTaskModal';
import { TaskFilters } from './TaskFilters';
import { Input } from '../../shared/Input';
import { TaskCard } from './TaskCard';
import { EditTaskModal } from './EditTaskModal';
import { Task } from '../../../api/types/task';
import { cardGridStyles } from '../shared/cardStyles';

export function TasksPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tasks } = useTasks();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    dueDate: 'all'
  });

  const completedTasks = tasks.filter((task: Task) => task && task.status === 'Completed').length;

  const selectedTask = selectedTaskId ? tasks.find((t: Task) => t.id === selectedTaskId) : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed bg-gradient-to-br from-[var(--color-background)] to-[var(--color-surface)] -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-100/50 dark:bg-green-900/30 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {completedTasks} of {tasks.length} tasks completed
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)]
                bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80
                text-[var(--color-text)] transition-colors
                ${showFilters ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : ''}
              `}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              <button
                onClick={() => setFilters({ status: 'all', priority: 'all', dueDate: 'all' })}
                className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
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
          </div>
        )}

        {/* Tasks Grid/List */}
        {viewMode === 'grid' ? (
          <div className={cardGridStyles}>
            {tasks.map((task: Task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="cursor-pointer w-full"
              >
                <TaskCard task={task} viewMode="grid" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 px-0.5">
            {tasks.map((task: Task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="cursor-pointer w-full"
              >
                <TaskCard task={task} viewMode="list" />
              </div>
            ))}
          </div>
        )}

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