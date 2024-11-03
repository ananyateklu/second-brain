import { useState } from 'react';
import { X, Lightbulb, Star, Trash2, Archive } from 'lucide-react';
import { Note } from '../../../../contexts/NotesContext';
import { useNotes } from '../../../../contexts/NotesContext';
import { WarningModal } from '../../../shared/WarningModal';

interface HeaderProps {
  idea: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ idea, onClose, onShowDeleteConfirm }: HeaderProps) {
  const { toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowArchiveWarning(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowDeleteConfirm();
  };

  const handleArchiveConfirm = async () => {
    try {
      await archiveNote(idea.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive idea:', error);
    } finally {
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Idea
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last updated {new Date(idea.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavoriteNote(idea.id);
            }}
            className={`p-2 rounded-lg transition-colors ${
              idea.isFavorite
                ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
            }`}
          >
            <Star className="w-5 h-5" fill={idea.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleArchiveClick}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
            title="Archive idea"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
            title="Delete idea"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <WarningModal
        isOpen={showArchiveWarning}
        onClose={() => setShowArchiveWarning(false)}
        onConfirm={handleArchiveConfirm}
        type="archive"
        title={idea.title}
      />
    </>
  );
}
