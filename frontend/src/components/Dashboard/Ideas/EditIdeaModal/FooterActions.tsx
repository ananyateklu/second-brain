interface FooterActionsProps {
    onClose: () => void;
    onSave: () => void;
    isLoading: boolean;
    getBorderStyle: () => string;
}

export function FooterActions({ onClose, onSave, isLoading, getBorderStyle }: FooterActionsProps) {
    return (
        <div className={`flex justify-end gap-3 px-4 py-3 border-t ${getBorderStyle()} bg-[var(--color-surface)] w-full`}>
            <button
                onClick={onClose}
                disabled={isLoading} // Also disable cancel if main action is loading for consistency
                className="px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                onClick={onSave}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-[var(--color-idea)] hover:bg-[var(--color-idea)]/90 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
                {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
} 