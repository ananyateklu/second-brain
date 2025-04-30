import { useTasks } from '../../../contexts/tasksContextUtils';
import { TaskCard } from './TaskCard';
import { Task } from '../../../types/task';
import { LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

interface TaskListProps {
  searchQuery: string;
  filters: {
    status: string;
    priority: string;
    dueDate: string;
  };
}

export function TaskList({ searchQuery, filters }: TaskListProps) {
  const { tasks } = useTasks();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredTasks = tasks.filter((task: Task): task is Task => {
    // First check if task exists and has required properties
    if (!task || typeof task.title !== 'string' || typeof task.description !== 'string') {
      return false;
    }

    // Search filter
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = filters.status === 'all' || task.status === filters.status;

    // Priority filter
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;

    // Due date filter
    let matchesDueDate = true;
    if (filters.dueDate !== 'all') {
      const today = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;

      switch (filters.dueDate) {
        case 'today':
          matchesDueDate = dueDate?.toDateString() === today.toDateString();
          break;
        case 'week': {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          matchesDueDate = dueDate ? dueDate <= weekFromNow : false;
          break;
        }
        case 'overdue':
          matchesDueDate = dueDate ? dueDate < today : false;
          break;
        case 'no-date':
          matchesDueDate = !dueDate;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No tasks found. Create your first task!
        </p>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery
            ? "No tasks match your search criteria"
            : "No tasks found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${
              viewMode === 'list'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${
              viewMode === 'grid'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tasks Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        : 'space-y-2'
      }>
        {filteredTasks.map((task: Task) => (
          <TaskCard 
            key={task.id} 
            task={task}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}