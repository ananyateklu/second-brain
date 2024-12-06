import { Trash2 } from 'lucide-react';
import { Reminder } from '../../../../api/types/reminder';

interface HeaderProps {
  reminder: Reminder;
  onShowDeleteConfirm: () => void;
  isSaving?: boolean;
}

export function Header({ 
  reminder, 
  onShowDeleteConfirm,
  isSaving = false 
}: HeaderProps) {
  return (
    <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Reminder
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated {new Date(reminder.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowDeleteConfirm}
            disabled={isSaving}
            className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 