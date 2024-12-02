import { X, MoreVertical, Trash2 } from 'lucide-react';
import { Task } from '../../../../api/types/task';

interface HeaderProps {
  task: Task;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ task, onClose, onShowDeleteConfirm }: HeaderProps) {
  return (
    <div className="shrink-0 px-6 py-4 border-b border-gray-200/30 dark:border-[#1C1C1E] bg-white dark:bg-[#111111] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Task
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated {new Date(task.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowDeleteConfirm}
            className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 