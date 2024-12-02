import React, { useState } from 'react';
import { CheckSquare, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useTasks } from '../../../contexts/TasksContext';
import { TaskList } from './TaskList';
import { NewTaskModal } from './NewTaskModal';
import { TaskFilters } from './TaskFilters';
import { Input } from '../../shared/Input';

export function TasksPage() {
  const { tasks } = useTasks();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    dueDate: 'all'
  });

  const completedTasks = tasks.filter(task => task && task.status === 'Completed').length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient - matches Dashboard.tsx */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
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
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
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
              className="bg-white dark:bg-[#1C1C1E] border-gray-200/50 dark:border-[#2C2C2E] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/50 dark:border-[#2C2C2E]
              bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]
              text-gray-700 dark:text-gray-300 transition-colors
              ${showFilters ? 'bg-gray-50 dark:bg-[#2C2C2E]' : ''}
            `}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={() => setFilters({ status: 'all', priority: 'all', dueDate: 'all' })}
                className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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

        {/* Task List */}
        <TaskList
          searchQuery={searchQuery}
          filters={filters}
        />

        {/* New Task Modal */}
        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
        />
      </div>
    </div>
  );
}