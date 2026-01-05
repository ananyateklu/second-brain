import { EmptyState } from '../../../components/ui/EmptyState';
import type { TrashNotesResponse } from '../../../types/notes';

interface TrashNotesContentProps {
  trashData?: TrashNotesResponse;
  directoryViewMode: string;
  onRestoreNote: (noteId: string) => void;
  isRestorePending: boolean;
  onPermanentDelete: (noteId: string) => void;
  isPermanentDeletePending: boolean;
}

export function TrashNotesContent({
  trashData,
  directoryViewMode,
  onRestoreNote,
  isRestorePending,
  onPermanentDelete,
  isPermanentDeletePending,
}: TrashNotesContentProps) {
  if (!trashData || trashData.items.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            className="h-8 w-8"
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        }
        title="Trash is empty"
        description="Deleted notes will appear here. You can restore or permanently delete them."
      />
    );
  }

  return (
    <div className={`grid gap-4 ${directoryViewMode === 'card' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
      {trashData.items.map((note) => (
        <div
          key={note.id}
          className="group relative rounded-xl border p-4 transition-all duration-200"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
            borderColor: 'var(--border)',
            opacity: 0.85,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium truncate mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {note.title}
              </h3>
              {note.summary && (
                <p
                  className="text-sm line-clamp-2 mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {note.summary}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>Deleted {note.deletedAt ? new Date(note.deletedAt).toLocaleDateString() : 'Unknown'}</span>
                {note.folder && (
                  <>
                    <span>•</span>
                    <span>{note.folder}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => { onRestoreNote(note.id); }}
              disabled={isRestorePending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
                color: 'var(--color-brand-500)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restore
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
                  onPermanentDelete(note.id);
                }
              }}
              disabled={isPermanentDeletePending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
