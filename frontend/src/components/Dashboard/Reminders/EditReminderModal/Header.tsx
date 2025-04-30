import { Trash2, Bell, X } from 'lucide-react';
import { Reminder } from '../../../../types/reminder';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface HeaderProps {
  reminder: Reminder;
  onShowDeleteConfirm: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function Header({
  reminder,
  onShowDeleteConfirm,
  onClose,
  isSaving = false
}: HeaderProps) {
  const { theme } = useTheme();

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowDeleteConfirm();
  };

  return (
    <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${getBorderStyle()} bg-[var(--color-surface)]`}>
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[var(--color-reminder)]/10 rounded-lg">
          <Bell className="w-5 h-5 text-[var(--color-reminder)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            Edit Reminder
          </h2>
          <p className="text-xs text-[var(--color-textSecondary)]">
            Last updated {new Date(reminder.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isSaving}
          className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete reminder"
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