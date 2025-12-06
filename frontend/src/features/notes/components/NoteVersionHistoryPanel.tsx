/**
 * NoteVersionHistoryPanel
 * Slide-out panel displaying version history for a note
 */

import { useState } from 'react';
import { useNoteVersionHistory, useRestoreNoteVersion } from '../hooks/use-note-versions';
import { NoteVersionTimeline } from './NoteVersionTimeline';
import { NoteVersionDiffViewer } from './NoteVersionDiffViewer';

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
  const { data: history, isLoading } = useNoteVersionHistory(noteId);
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-96 bg-[var(--surface-card)] shadow-2xl border-l z-50 flex flex-col"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-600)]" />
            </div>
          ) : !history || history.versions.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No version history available.</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
                Versions are created when you save changes.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {history.totalVersions}
                  </span>
                  {' '}version{history.totalVersions !== 1 ? 's' : ''} saved
                </p>
              </div>
              <NoteVersionTimeline
                versions={history.versions}
                currentVersion={history.currentVersion}
                onCompare={handleCompare}
                onRestore={handleRestore}
                isRestoring={isRestoring}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Tip: Click "Compare" to see what changed between versions
          </p>
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && selectedVersions && (
        <NoteVersionDiffViewer
          noteId={noteId}
          fromVersion={selectedVersions[0]}
          toVersion={selectedVersions[1]}
          onClose={() => { setShowDiff(false); }}
        />
      )}
    </>
  );
}
