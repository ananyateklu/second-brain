import { Trash2, Clock } from 'lucide-react';
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
    <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Edit Reminder
          </h2>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-textSecondary)]" />
            <span className="text-sm text-[var(--color-textSecondary)]">
              Last updated {new Date(reminder.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onShowDeleteConfirm}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
} 