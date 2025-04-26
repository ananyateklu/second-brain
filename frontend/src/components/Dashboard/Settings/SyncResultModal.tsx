import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    errors: number;
    message?: string;
    lastSynced: string;
}

interface SyncResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: SyncResult | null;
}

export function SyncResultModal({ isOpen, onClose, result }: SyncResultModalProps) {
    const { theme } = useTheme();

    if (!result) return null;

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: 'spring', stiffness: 300, damping: 30 }
        },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
    };

    const StatItem = ({ icon: Icon, label, value, colorClass }: { icon: React.ElementType, label: string, value: number, colorClass: string }) => (
        <div className={`flex items-center justify-between p-3 bg-[var(--color-surface)]/50 rounded-lg border ${getBorderStyle()}`}>
            <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <span className="text-sm text-[var(--color-textSecondary)]">{label}</span>
            </div>
            <span className={`text-lg font-semibold ${colorClass}`}>{value}</span>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="sync-modal-backdrop"
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={onClose}
                >
                    <motion.div
                        key="sync-modal-content"
                        className={`relative w-full max-w-md bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border ${getBorderStyle()}`}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-5 py-4 border-b ${getBorderStyle()} bg-[var(--color-surface)]`}>
                            <div className="flex items-center gap-3">
                                {result.success ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                )}
                                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                                    Sync {result.success ? 'Complete' : 'Failed'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {result.message && (
                                <p className={`text-sm ${result.success ? 'text-[var(--color-textSecondary)]' : 'text-red-500'}`}>
                                    {result.message}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <StatItem
                                    icon={ArrowUp}
                                    label="Created"
                                    value={result.created}
                                    colorClass="text-green-500"
                                />
                                <StatItem
                                    icon={RefreshCw}
                                    label="Updated"
                                    value={result.updated}
                                    colorClass="text-blue-500"
                                />
                                <StatItem
                                    icon={ArrowDown} // Or Trash2 if delete means removed from both
                                    label="Deleted/Removed"
                                    value={result.deleted}
                                    colorClass="text-orange-500"
                                />
                                <StatItem
                                    icon={AlertCircle}
                                    label="Errors"
                                    value={result.errors}
                                    colorClass={result.errors > 0 ? "text-red-500" : "text-[var(--color-textSecondary)]"}
                                />
                            </div>

                            <p className="text-xs text-center text-[var(--color-textSecondary)] pt-2">
                                Last synced: {new Date(result.lastSynced).toLocaleString()}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className={`px-5 py-3 border-t ${getBorderStyle()} bg-[var(--color-surface)] flex justify-end`}>
                            <button
                                onClick={onClose}
                                className={`px-4 py-2 border ${getBorderStyle()} rounded-lg text-sm font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] transition-colors`}
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
} 