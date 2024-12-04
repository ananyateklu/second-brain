import { useState } from 'react';
import { X, Type, Star, Archive, Trash2 } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { WarningModal } from '../../../shared/WarningModal';

export interface HeaderProps {
  note: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ note, onClose, onShowDeleteConfirm }: HeaderProps) {
  const { toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  };

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
      setShowArchiveWarning(false);
      await archiveNote(note.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive note:', error);
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Type className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Note
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last updated {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFavorite}
            className={`p-2 rounded-lg transition-colors ${note.isFavorite
              ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
              : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
          >
            <Star className="w-5 h-5" fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleArchiveClick}
            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
            title="Archive note"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
            title="Delete note"
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
        title={note.title}
      />
    </>
  );
}