import React, { useState } from 'react';
import { Square, CheckSquare, Calendar, Link2, AlertCircle } from 'lucide-react';
import { Task } from '../../../api/types/task';
import { EditTaskModal } from './EditTaskModal/index';
import { useTasks } from '../../../contexts/TasksContext';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { toggleTaskStatus } = useTasks();
  const [showEditModal, setShowEditModal] = useState(false);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-orange-600 dark:text-orange-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <>
      <div className="w-full">
        <div className="bg-[#1C1C1E] dark:bg-[#1C1C1E] backdrop-blur-md
          border border-[#2C2C2E] dark:border-[#2C2C2E]
          shadow-sm hover:shadow-md
          p-4 rounded-xl
          hover:border-[#64ab6f] dark:hover:border-[#64ab6f]
          transition-all duration-200">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskStatus(task.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                task.status === 'Completed'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 hover:bg-gray-100/50 dark:hover:bg-[#1C1C1E]'
              }`}
            >
              {task.status === 'Completed' ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowEditModal(true)}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-semibold ${
                    task.status === 'Completed'
                      ? 'text-gray-500 dark:text-gray-400 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </h3>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                </div>

                <p className={`text-sm ${
                  task.status === 'Completed'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-600 dark:text-gray-300'
                } line-clamp-2`}>
                  {task.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  {task.dueDate && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 ${getPriorityColor(task.priority)}`}>
                    <AlertCircle className="w-4 h-4" />
                    <span className="capitalize">{task.priority}</span>
                  </div>

                  {task.linkedItems && task.linkedItems.length > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Link2 className="w-4 h-4" />
                      <span>
                        {task.linkedItems.length} linked
                      </span>
                    </div>
                  )}
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        taskId={task.id}
      />
    </>
  );
}