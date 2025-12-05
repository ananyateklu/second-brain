import { useNoteVersionDiff } from '../hooks/use-note-versions';
import { Modal } from '../../../components/ui/Modal';

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
  const { data: diff, isLoading } = useNoteVersionDiff(noteId, fromVersion, toVersion, true);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Compare v${fromVersion} → v${toVersion}`}
      maxWidth="max-w-4xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-brand-600)' }} />
        </div>
      ) : diff ? (
        <div className="space-y-4">
          {/* Change summary */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            {diff.titleChanged && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Title changed</span>
            )}
            {diff.contentChanged && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Content changed</span>
            )}
            {diff.tagsChanged && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">Tags changed</span>
            )}
            {diff.folderChanged && (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Folder changed</span>
            )}
            {diff.archivedChanged && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Archive status changed</span>
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
                  <p className={diff.titleChanged ? 'line-through text-red-500' : ''} style={{ color: diff.titleChanged ? '#ef4444' : 'var(--text-primary)' }}>
                    {diff.fromVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.fromVersion.content}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.fromVersion.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded ${diff.tagsRemoved.includes(tag) ? 'bg-red-100 text-red-800 line-through' : 'bg-gray-100'
                          }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {diff.fromVersion.folder && (
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Folder</label>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{diff.fromVersion.folder}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Archived</label>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{diff.fromVersion.isArchived ? 'Yes' : 'No'}</p>
                </div>
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
                  <p className={diff.titleChanged ? 'text-green-600 font-medium' : ''} style={{ color: diff.titleChanged ? '#16a34a' : 'var(--text-primary)' }}>
                    {diff.toVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.toVersion.content}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.toVersion.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded ${diff.tagsAdded.includes(tag) ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                          }`}
                      >
                        {diff.tagsAdded.includes(tag) && '+ '}
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {diff.toVersion.folder && (
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Folder</label>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{diff.toVersion.folder}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Archived</label>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{diff.toVersion.isArchived ? 'Yes' : 'No'}</p>
                </div>
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
