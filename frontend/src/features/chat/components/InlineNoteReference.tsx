import { useNotes } from '../../notes/hooks/use-notes-query';
import { useUIStore } from '../../../store/ui-store';

interface InlineNoteReferenceProps {
    noteId: string;
    noteTitle?: string;
    /** Variant for different contexts - 'default' for final responses, 'subtle' for thinking/tool execution */
    variant?: 'default' | 'subtle';
}

/**
 * Displays an inline note reference that opens the edit modal when clicked.
 * Used when the agent references notes by ID in its responses.
 */
export function InlineNoteReference({ noteId, noteTitle, variant = 'default' }: InlineNoteReferenceProps) {
    const { data: allNotes, isLoading } = useNotes();
    const openEditModal = useUIStore((state) => state.openEditModal);

    const note = allNotes?.find((n) => n.id === noteId);

    if (!note && !isLoading) {
        // Note not found - show the ID
        return (
            <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
                style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-tertiary)',
                }}
            >
                (ID: {noteId})
            </span>
        );
    }

    const displayTitle = noteTitle || note?.title || 'Loading...';

    const handleClick = () => {
        if (note) {
            openEditModal(noteId);
        }
    };

    // Different styling based on variant
    const isSubtle = variant === 'subtle';
    const bgOpacity = isSubtle ? '8%' : '15%';
    const borderOpacity = isSubtle ? '20%' : '40%';
    const textOpacity = isSubtle ? 0.7 : 1;

    return (
        <button
            onClick={handleClick}
            disabled={!note}
            className="inline-flex items-center gap-1.5 px-1 py-0.5 mx-1 my-0.5 rounded-lg text-xs font-medium transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            style={{
                backgroundColor: `color-mix(in srgb, var(--color-brand-500) ${bgOpacity}, transparent)`,
                border: `1px solid color-mix(in srgb, var(--color-brand-500) ${borderOpacity}, transparent)`,
                color: 'var(--color-brand-500)',
                cursor: note ? 'pointer' : 'default',
                opacity: note ? textOpacity : 0.5,
            }}
        >
            <svg
                className="w-3 h-3 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
            <span>{displayTitle}</span>
        </button>
    );
}

