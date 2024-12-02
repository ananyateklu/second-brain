import { useState } from 'react';
import { Square, CheckSquare, Calendar, Tag } from 'lucide-react';
import { Task } from '../../../api/types/task';
import { EditTaskModal } from './EditTaskModal/index';
import { useTasks } from '../../../contexts/TasksContext';

interface TaskCardProps {
  task: Task;
  viewMode: 'grid' | 'list';
}

export function TaskCard({ task, viewMode }: TaskCardProps) {
  const { updateTask } = useTasks();
  const [showEditModal, setShowEditModal] = useState(false);

  const getPriorityStyles = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <>
      <button 
        type="button"
        onClick={() => setShowEditModal(true)}
        className={`
          relative group w-full text-left
          ${viewMode === 'grid' 
            ? 'h-[220px] flex flex-col'
            : ''
          }
          bg-white dark:bg-[#1C1C1E]
          border border-gray-200/50 dark:border-[#2C2C2E]
          hover:border-primary-500 dark:hover:border-primary-500
          rounded-xl p-3 shadow-sm
          transition-all duration-200
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
      >
        {task.priority && (
          <span className={`
            absolute top-3 right-3
            inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
            ${getPriorityStyles(task.priority)}
          `}>
            {task.priority}
          </span>
        )}
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {task.title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {task.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {task.dueDate && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{task.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask(task.id, { status: task.status === 'Completed' ? 'Incomplete' : 'Completed' });
                  }}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${task.status === 'Completed'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 hover:bg-gray-100/50 dark:hover:bg-[#2C2C2E]'
                    }
                  `}
                >
                  {task.status === 'Completed' ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </button>

      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        taskId={task.id}
      />
    </>
  );
}