import { Star, Link2, Tag, Lightbulb, Archive, Pin } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { useNotes } from '../../../contexts/NotesContext';
import { useState } from 'react';

interface IdeaCardProps {
  idea: Note;
  onClick: (ideaId: string) => void;
}

export function IdeaCard({ idea, onClick }: IdeaCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(idea.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinNote(idea.id);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveWarning(true);
  };

  const handleArchiveConfirm = async () => {
    try {
      await archiveNote(idea.id);
      setShowArchiveWarning(false);
    } catch (error) {
      console.error('Failed to archive idea:', error);
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div
        onClick={() => onClick(idea.id)}
        className="group bg-white dark:bg-dark-card rounded-xl p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors">
                {idea.title}
              </h3>
              <p className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                {idea.content}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handlePin}
              className={`p-1.5 rounded-lg transition-colors ${
                idea.isPinned
                  ? 'text-primary-600 dark:text-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              title={idea.isPinned ? 'Unpin idea' : 'Pin idea'}
            >
              <Pin className="w-4 h-4" fill={idea.isPinned ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleFavorite}
              className={`p-1.5 rounded-lg transition-colors ${
                idea.isFavorite
                  ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" fill={idea.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleArchiveClick}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              title="Archive idea"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags and metadata section */}
        <div className="mt-3 flex flex-wrap gap-2">
          {idea.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span>{idea.linkedNoteIds?.length || 0} connections</span>
          </div>
          <span>{formatDate(idea.updatedAt)}</span>
        </div>
      </div>

      {/* Archive Warning Modal */}
      {showArchiveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Archive Idea?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to archive this idea? You can access it later in the archive.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowArchiveWarning(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}