/**
 * NoteVersionHistoryPanel
 * Inline panel displaying version history for a note (renders inside parent container)
 *
 * Features:
 * - Smooth slide-in animation
 * - Timeline visualization of versions
 * - Side-by-side diff comparison
 * - One-click version restore
 */

import { useState } from 'react';
import { useNoteVersionHistory, useRestoreNoteVersion } from '../hooks/use-note-versions';
import { NoteVersionTimeline } from './NoteVersionTimeline';
import { NoteVersionDiffViewer } from './NoteVersionDiffViewer';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

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
    if (confirm(`Restore note to version ${targetVersion}? This will create a new version with the content from version ${targetVersion}.`)) {
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
      {/* Inline panel - renders inside parent flex container */}
      <div
        className="flex flex-col border-l overflow-hidden rounded-br-3xl"
        style={{
          width: '380px',
          minWidth: '380px',
          height: '100%',
          backgroundColor: 'transparent',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'transparent',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'linear-gradient(to bottom right, var(--color-brand-600), var(--color-brand-700))',
              }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Version History
              </h3>
              {history && history.totalVersions > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
                    color: 'var(--color-brand-400)',
                  }}
                >
                  {history.totalVersions} version{history.totalVersions !== 1 ? 's' : ''} • v{history.currentVersion}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105 hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
            style={{
              color: 'var(--text-tertiary)',
            }}
            aria-label="Close version history"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner message="Loading history..." />
            </div>
          ) : !history || history.versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'transparent' }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                No version history
              </p>
              <p
                className="text-[10px] max-w-[200px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Versions are created when you save changes.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Timeline */}
              <NoteVersionTimeline
                versions={history.versions}
                currentVersion={history.currentVersion}
                onCompare={handleCompare}
                onRestore={handleRestore}
                isRestoring={isRestoring}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 border-t flex-shrink-0 rounded-br-3xl"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'transparent',
          }}
        >
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p
              className="text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Click <strong style={{ color: 'var(--text-secondary)' }}>Compare</strong> to view changes
            </p>
          </div>
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
