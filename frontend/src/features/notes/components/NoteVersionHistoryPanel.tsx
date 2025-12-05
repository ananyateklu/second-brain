import { useState } from 'react';
import { useNoteVersionHistory, useRestoreNoteVersion } from '../hooks/use-note-versions';
import { NoteVersionTimeline } from './NoteVersionTimeline';
import { NoteVersionDiffViewer } from './NoteVersionDiffViewer';
import type { NoteVersion } from '../../../types/notes';

interface NoteVersionHistoryPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function NoteVersionHistoryPanel({
  noteId,
  isOpen,
  onClose,
  onRestore,
}: NoteVersionHistoryPanelProps) {
  const { data: history, isLoading } = useNoteVersionHistory(noteId, isOpen);
  const { mutate: restoreVersion, isPending: isRestoring } = useRestoreNoteVersion();
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleRestore = (targetVersion: number) => {
    if (confirm(`Restore note to version ${targetVersion}? This will create a new version.`)) {
      restoreVersion(
        { noteId, targetVersion },
        {
          onSuccess: () => {
            onRestore();
            onClose();
          },
        }
      );
    }
  };

  const handleCompare = (fromVersion: number, toVersion: number) => {
    setSelectedVersions([fromVersion, toVersion]);
    setShowDiff(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-96 bg-surface-card shadow-2xl border-l z-50 flex flex-col"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Version History
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-brand-600)' }} />
          </div>
        ) : history?.versions.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <p>No version history available.</p>
            <p className="text-sm mt-2">Versions are created when you save changes.</p>
          </div>
        ) : (
          <NoteVersionTimeline
            versions={history?.versions || []}
            currentVersion={history?.currentVersion || 1}
            onCompare={handleCompare}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
        )}
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && selectedVersions && (
        <NoteVersionDiffViewer
          noteId={noteId}
          fromVersion={selectedVersions[0]}
          toVersion={selectedVersions[1]}
          onClose={() => {
            setShowDiff(false);
            setSelectedVersions(null);
          }}
        />
      )}
    </div>
  );
}
