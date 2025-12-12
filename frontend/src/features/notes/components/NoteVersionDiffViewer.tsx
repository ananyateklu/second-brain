/**
 * NoteVersionDiffViewer
 * Modal component showing side-by-side comparison of two note versions
 */

import { useNoteVersionDiff } from '../hooks/use-note-versions';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

interface NoteVersionDiffViewerProps {
  noteId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

export function NoteVersionDiffViewer({
  noteId,
  fromVersion,
  toVersion,
  onClose,
}: NoteVersionDiffViewerProps) {
  const { data: diff, isLoading } = useNoteVersionDiff(noteId, fromVersion, toVersion);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Compare v${fromVersion} → v${toVersion}`}
      maxWidth="max-w-4xl"
      icon={
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      }
    >
      {isLoading ? (
        <LoadingSpinner message="Loading diff..." className="h-64" />
      ) : diff ? (
        <div className="space-y-4">
          {/* Change summary */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            {diff.titleChanged && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                Title changed
              </span>
            )}
            {diff.contentChanged && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Content changed
              </span>
            )}
            {diff.tagsChanged && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                Tags changed
              </span>
            )}
            {diff.folderChanged && (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Folder changed
              </span>
            )}
            {diff.archivedChanged && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Archive status changed
              </span>
            )}
            {!diff.titleChanged && !diff.contentChanged && !diff.tagsChanged && !diff.folderChanged && !diff.archivedChanged && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                No changes detected
              </span>
            )}
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* From version */}
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Version {fromVersion}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Title</label>
                  <p className={diff.titleChanged ? 'line-through text-red-500' : ''} style={{ color: diff.titleChanged ? undefined : 'var(--text-primary)' }}>
                    {diff.fromVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.fromVersion.content || <span className="italic text-gray-400">No content</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.fromVersion.tags.length === 0 ? (
                      <span className="text-xs italic text-gray-400">No tags</span>
                    ) : (
                      diff.fromVersion.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded ${diff.tagsRemoved.includes(tag)
                              ? 'bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          style={{ color: diff.tagsRemoved.includes(tag) ? undefined : 'var(--text-secondary)' }}
                        >
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {diff.folderChanged && (
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Folder</label>
                    <p className="line-through text-red-500">
                      {diff.fromVersion.folder || <span className="italic">No folder</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* To version */}
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-brand-200)' }}>
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Version {toVersion}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Title</label>
                  <p className={diff.titleChanged ? 'text-green-600 font-medium' : ''} style={{ color: diff.titleChanged ? undefined : 'var(--text-primary)' }}>
                    {diff.toVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.toVersion.content || <span className="italic text-gray-400">No content</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.toVersion.tags.length === 0 ? (
                      <span className="text-xs italic text-gray-400">No tags</span>
                    ) : (
                      diff.toVersion.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded ${diff.tagsAdded.includes(tag)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          style={{ color: diff.tagsAdded.includes(tag) ? undefined : 'var(--text-secondary)' }}
                        >
                          {diff.tagsAdded.includes(tag) && '+ '}
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {diff.folderChanged && (
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Folder</label>
                    <p className="text-green-600 font-medium">
                      {diff.toVersion.folder || <span className="italic">No folder</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Failed to load version diff.
        </p>
      )}
    </Modal>
  );
}
