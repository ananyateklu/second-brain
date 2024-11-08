import React, { useState, useCallback } from 'react';
import { CheckSquare, Square, Calendar, Clock, Tag, Link2, AlertCircle } from 'lucide-react';
import { Task, useTasks } from '../../../contexts/TasksContext';
import { EditTaskModal } from './EditTaskModal';

interface TaskCardProps {
  task: Task;
  viewMode: 'list' | 'grid';
}

export function TaskCard({ task, viewMode }: TaskCardProps) {
  const { toggleTaskStatus } = useTasks();
  const [showEditModal, setShowEditModal] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const ListViewCard = () => (
    <div className="glass-morphism p-4 rounded-xl border border-gray-200/20 dark:border-gray-700/30 hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleTaskStatus(task.id)}
          className={`p-1 rounded-lg transition-colors ${
            task.status === 'completed'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
          }`}
        >
          {task.status === 'completed' ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0" onClick={() => setShowEditModal(true)}>
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-medium truncate ${
              task.status === 'completed'
                ? 'text-gray-500 dark:text-gray-400 line-through'
                : 'text-gray-900 dark:text-white'
            }`}>
              {task.title}
            </h3>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}

            <div className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
              <AlertCircle className="w-3 h-3" />
              <span className="capitalize">{task.priority}</span>
            </div>

            {task.tags.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Tag className="w-3 h-3" />
                <span>{task.tags.length} tags</span>
              </div>
            )}

            {(task.linkedNotes.length > 0 || task.linkedIdeas.length > 0) && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Link2 className="w-3 h-3" />
                <span>{task.linkedNotes.length + task.linkedIdeas.length} linked</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const GridViewCard = () => (
    <div className="glass-morphism p-4 rounded-xl border border-gray-200/20 dark:border-gray-700/30 hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-200">
      <div className="flex items-start gap-4">
        <button
          onClick={() => toggleTaskStatus(task.id)}
          className={`p-1 rounded-lg transition-colors ${
            task.status === 'completed'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
          }`}
        >
          {task.status === 'completed' ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0" onClick={() => setShowEditModal(true)}>
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-medium ${
              task.status === 'completed'
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
            task.status === 'completed'
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

            {(task.linkedNotes.length > 0 || task.linkedIdeas.length > 0) && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Link2 className="w-4 h-4" />
                <span>
                  {task.linkedNotes.length + task.linkedIdeas.length} linked
                </span>
              </div>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {viewMode === 'list' ? <ListViewCard /> : <GridViewCard />}
      
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
      />
    </>
  );
}