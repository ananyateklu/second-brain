import { Clock, Trash2, X } from 'lucide-react';
import { Task } from '../../../../api/types/task';

interface HeaderProps {
  task: Task;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
  isSaving?: boolean;
}

export function Header({ task, onClose, onShowDeleteConfirm, isSaving = false }: HeaderProps) {
  return (
    <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Edit Task
          </h2>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-textSecondary)]" />
            <span className="text-sm text-[var(--color-textSecondary)]">
              Last updated {new Date(task.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowDeleteConfirm}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 