import { CheckSquare, Trash2, X } from 'lucide-react';
import { Task } from '../../../../api/types/task';

interface HeaderProps {
  task: Task;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
  isSaving?: boolean;
}

export function Header({ task, onClose, onShowDeleteConfirm, isSaving = false }: HeaderProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowDeleteConfirm();
  };

  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[var(--color-task)]/10 rounded-lg">
          <CheckSquare className="w-5 h-5 text-[var(--color-task)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            Edit Task
          </h2>
          <p className="text-xs text-[var(--color-textSecondary)]">
            Last updated {new Date(task.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isSaving}
          className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete task"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
} 