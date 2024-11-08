import { Star, Link2, Tag, Lightbulb, Archive, Pin } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { useNotes } from '../../../contexts/NotesContext';
import { useState } from 'react';
import { WarningModal } from '../../shared/WarningModal';

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
        className="glass-morphism p-4 rounded-xl border border-gray-200/20 dark:border-gray-700/30 hover:border-primary-400 dark:hover:border-primary-400 transition-all duration-200 cursor-pointer"
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
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'
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
                  : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
              title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" fill={idea.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleArchiveClick}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              title="Archive idea"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags section */}
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

        {/* Metadata section */}
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
              <WarningModal
                isOpen={showArchiveWarning}
                onClose={() => setShowArchiveWarning(false)}
                onConfirm={handleArchiveConfirm}
                type="archive"
                title={idea.title}
              />
      )}
    </>
  );
}