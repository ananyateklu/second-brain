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
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskStatus(task.id);
              }}
              className={`p-1 rounded-lg transition-colors ${
                task.status === 'Completed'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
              }`}
            >
              {task.status === 'Completed' ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowEditModal(true)}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-medium ${
                    task.status === 'Completed'
                      ? 'text-gray-500 dark:text-gray-400 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </h3>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Overdue
                    </span>
                  )}
                </div>

                <p className={`mt-1 text-sm ${
                  task.status === 'Completed'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-600 dark:text-gray-300'
                }`}>
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