import type { TrashNotesResponse } from '../../../types/notes';

interface TrashHeaderProps {
  trashData: TrashNotesResponse;
  isEmptying: boolean;
  onEmptyTrash: () => void;
}

export function TrashHeader({ trashData, isEmptying, onEmptyTrash }: TrashHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3"
      style={{
        borderBottom: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
        background: 'color-mix(in srgb, var(--color-error) 5%, transparent)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--color-error)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Trash
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
            color: 'var(--color-error)',
          }}
        >
          {trashData.totalCount} {trashData.totalCount === 1 ? 'note' : 'notes'}
        </span>
      </div>
      <button
        onClick={() => {
          if (confirm('Are you sure you want to permanently delete all notes in trash? This action cannot be undone.')) {
            onEmptyTrash();
          }
        }}
        disabled={isEmptying}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
          color: 'var(--color-error)',
          border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {isEmptying ? 'Emptying...' : 'Empty Trash'}
      </button>
    </div>
  );
}
