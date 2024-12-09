import React from 'react';
import { AlertTriangle, Archive, Trash2, X } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  type: 'archive' | 'delete';
  title: string;
}

export function WarningModal({ isOpen, onClose, onConfirm, type, title }: WarningModalProps) {
  if (!isOpen) return null;

  const isDelete = type === 'delete';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-xl shadow-lg"
        onClick={handleModalClick}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-full ${
              isDelete 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              {isDelete ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isDelete ? 'Delete Note' : 'Archive Note'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDelete ? 'This action cannot be undone.' : 'You can restore archived notes later.'}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Are you sure you want to {type} "<span className="font-medium">{title}</span>"?
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isDelete
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
              }`}
            >
              {isDelete ? 'Delete' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarningModal; 