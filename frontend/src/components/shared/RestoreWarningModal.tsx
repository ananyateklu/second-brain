import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface RestoreWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
}

export function RestoreWarningModal({ isOpen, onClose, onConfirm, count }: RestoreWarningModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-xl shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-[#64ab6f]/20 text-[#64ab6f]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Restore Items
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected items will be moved back to their original location.
              </p>
            </div>
          </div>

          <div className="mb-6 p-3 bg-[#64ab6f]/10 dark:bg-[#64ab6f]/20 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-[#64ab6f] flex-shrink-0" />
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Are you sure you want to restore {count} {count === 1 ? 'item' : 'items'}?
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3C3C3E] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#64ab6f] hover:bg-[#64ab6f]/90 rounded-lg transition-colors"
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 