import { useNotes } from '../../notes/hooks/use-notes-query';
import { useBoundStore } from '../../../store/bound-store';

interface InlineNoteReferenceProps {
    noteId: string;
    noteTitle?: string;
    /** Variant: 'default' for responses, 'subtle' for thinking/tool execution */
    variant?: 'default' | 'subtle';
}

/**
 * Inline note reference that opens the edit modal when clicked.
 */
export function InlineNoteReference({ noteId, noteTitle, variant = 'default' }: InlineNoteReferenceProps) {
    const { data: allNotes, isLoading } = useNotes();
    const openEditModal = useBoundStore((state) => state.openEditModal);
    const note = allNotes?.find((n) => n.id === noteId);
    const opacity = variant === 'subtle' ? '8%' : '12%';

    if (!note && !isLoading) {
        return (
            <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-tertiary)' }}
            >
                (ID: {noteId})
            </span>
        );
    }

    return (
        <button
            onClick={() => note && openEditModal(noteId)}
            disabled={!note}
            title={noteTitle || note?.title || 'Loading...'}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 my-0.5 rounded-md text-xs font-medium transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] align-baseline"
            style={{
                backgroundColor: `color-mix(in srgb, var(--color-brand-500) ${opacity}, transparent)`,
                border: `1px solid color-mix(in srgb, var(--color-brand-500) ${opacity}, transparent)`,
                color: `color-mix(in srgb, var(--color-brand-500) 70%, var(--text-secondary))`,
                cursor: note ? 'pointer' : 'default',
                opacity: note ? 1 : 0.5,
                maxWidth: '200px',
                verticalAlign: 'baseline',
            }}
        >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
            <span className="truncate">{noteTitle || note?.title || 'Loading...'}</span>
        </button>
    );
}

