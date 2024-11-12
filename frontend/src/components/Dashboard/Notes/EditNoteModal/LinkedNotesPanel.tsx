import { Link2, Plus, Type, Lightbulb, X } from 'lucide-react';
import { Note, useNotes } from '../../../../contexts/NotesContext';

interface LinkedNotesPanelProps {
  readonly linkedNotes: Note[];
  readonly onShowAddLink: () => void;
  readonly currentNoteId: string;
  readonly isIdea?: boolean;
}

export function LinkedNotesPanel({ 
  linkedNotes, 
  onShowAddLink, 
  currentNoteId,
  isIdea = false 
}: LinkedNotesPanelProps) {
  const { removeLink } = useNotes();

  const handleUnlink = async (linkedNoteId: string) => {
    if (!currentNoteId) {
      console.error('Missing currentNoteId');
      return;
    }
    try {
      await removeLink(currentNoteId, linkedNoteId);
    } catch (error) {
      console.error('Failed to unlink:', error);
    }
  };

  return (
    <div className="border-l border-gray-200/30 dark:border-gray-700/30 flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Connections
            </h3>
          </div>
          <button
            type="button"
            onClick={onShowAddLink}
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
        {linkedNotes.length > 0 ? (
          linkedNotes.map(linkedNote => (
            <div
              key={linkedNote.id}
              className="group relative p-3 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                {linkedNote.isIdea ? (
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h6 className="font-medium text-gray-900 dark:text-white truncate">
                    {linkedNote.title}
                  </h6>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {linkedNote.content}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnlink(linkedNote.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No connections yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click "Connect" to link with {isIdea ? 'notes or ideas' : 'notes'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
