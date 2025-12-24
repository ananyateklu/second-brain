import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '../../../hooks/use-toast';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => Promise<void>;
  isDeleting?: boolean;
}

export const BulkActionsBar = memo(({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  isDeleting = false,
}: BulkActionsBarProps) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDeleteClick = async () => {
    if (selectedCount === 0) {
      toast.warning('No notes selected', 'Please select at least one note to delete.');
      return;
    }

    const confirmed = await toast.confirm({
      title: 'Delete Notes',
      description: `Are you sure you want to delete ${selectedCount} note${selectedCount === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      setIsConfirmingDelete(true);
      try {
        await onDelete();
      } finally {
        setIsConfirmingDelete(false);
      }
    }
  };

  const isProcessing = isDeleting || isConfirmingDelete;

  const content = (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl border shadow-2xl"
      style={{
        backgroundColor: 'var(--surface-card-solid)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <span
          className="px-3 py-1 rounded-full text-sm font-semibold"
          style={{
            backgroundColor: selectedCount > 0 ? 'var(--color-brand-600)' : 'var(--surface-hover)',
            color: selectedCount > 0 ? '#ffffff' : 'var(--text-secondary)',
          }}
        >
          {selectedCount}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          of {totalCount} selected
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />

      {/* Select All / Deselect All */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={isProcessing || selectedCount === totalCount}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-primary)',
          }}
        >
          Select All
        </button>
        <button
          type="button"
          onClick={onDeselectAll}
          disabled={isProcessing || selectedCount === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-primary)',
          }}
        >
          Deselect All
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => { void handleDeleteClick(); }}
        disabled={isProcessing || selectedCount === 0}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          backgroundColor: selectedCount > 0 ? 'var(--color-error-text)' : 'var(--surface-hover)',
          color: selectedCount > 0 ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
          boxShadow: selectedCount > 0 ? '0 4px 14px -4px color-mix(in srgb, var(--color-error) 40%, transparent)' : 'none',
        }}
      >
        {isProcessing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Deleting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </>
        )}
      </button>

      {/* Animation keyframes - injected via style tag */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );

  // Use portal to render outside of any scrolling containers
  // This ensures fixed positioning works relative to viewport, not a parent container
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
});

