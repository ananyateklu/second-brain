import { Trash2, Loader } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  isLoading,
  onClose,
  onConfirm
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)]">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-red-900/20 rounded-full">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              Delete Idea
            </h3>
            <p className="text-[var(--color-textSecondary)]">
              Are you sure you want to delete this idea? This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Idea</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 