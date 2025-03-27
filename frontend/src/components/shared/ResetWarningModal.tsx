import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';
import { createPortal } from 'react-dom';

interface ResetWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

export function ResetWarningModal({ isOpen, onClose, onConfirm }: ResetWarningModalProps) {
    const { theme } = useTheme();

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const getBgOverlayClass = () => {
        if (theme === 'midnight') {
            return 'bg-black/60';
        }
        return 'bg-black/50';
    };

    const getModalBgClass = () => {
        if (theme === 'midnight') {
            return 'bg-[#1e293b]';
        }
        return 'bg-white dark:bg-gray-900';
    };

    // Use createPortal to render the modal at the document body level
    return createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${getBgOverlayClass()} backdrop-blur-sm`}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}
        >
            <div
                className={`relative w-full max-w-md ${getModalBgClass()} rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 midnight:border-gray-700/30`}
                onClick={handleModalClick}
            >
                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 midnight:hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    {/* Icon and Title */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 midnight:bg-blue-900/20 text-blue-600 dark:text-blue-400 midnight:text-blue-300">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white midnight:text-white/90">
                                Reset Dashboard Stats
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 midnight:text-gray-400">
                                This will restore the default dashboard layout.
                            </p>
                        </div>
                    </div>

                    {/* Warning Message */}
                    <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 midnight:bg-amber-900/10 rounded-lg">
                        <div className="flex gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 midnight:text-amber-300 flex-shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-200 midnight:text-amber-200/90">
                                This will reset all dashboard stats to their default configuration. Any customizations you've made to the dashboard layout will be lost.
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
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 midnight:text-gray-300 bg-gray-100 dark:bg-gray-800 midnight:bg-white/5 hover:bg-gray-200 dark:hover:bg-gray-700 midnight:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            Reset Stats
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ResetWarningModal; 