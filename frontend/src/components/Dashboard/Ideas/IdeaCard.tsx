import { Star, Link2, Tag, Lightbulb, Archive, Pin } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { useNotes } from '../../../contexts/NotesContext';
import { useState } from 'react';
import { WarningModal } from '../../shared/WarningModal';

interface IdeaCardProps {
  idea: Note;
  viewMode?: 'grid' | 'list';
  onClick?: (ideaId: string) => void;
}

export function IdeaCard({ idea, viewMode, onClick }: IdeaCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(idea.id);
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinNote(idea.id);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
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
        className={`
          bg-white/20 dark:bg-gray-800/20
          border border-gray-200/30 dark:border-gray-700/30 
          shadow-sm hover:shadow-md
          p-4 rounded-xl
          hover:border-primary-400/50 dark:hover:border-primary-400/50 
          transition-colors duration-200 cursor-pointer
          ${idea.isPinned && idea.isFavorite ? 'ring-1 ring-purple-500/20 ring-amber-500/20' : ''}
          ${idea.isPinned ? 'ring-1 ring-primary-500/20' : ''}
          ${idea.isFavorite ? 'ring-1 ring-amber-500/20' : ''}
          ${viewMode === 'list' ? 'flex items-start gap-4' : 'flex flex-col'}
        `}
        onClick={() => onClick?.(idea.id)}
        style={{
          isolation: 'isolate',
        }}
      >
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors">
                  {idea.title}
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                  {idea.content}
                </p>
              </div>
            </div>

            {viewMode !== 'list' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePin}
                  className={`p-1.5 rounded-lg transition-colors ${
                    idea.isPinned
                      ? 'text-primary-600 dark:text-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20'
                      : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                  title={idea.isPinned ? 'Unpin idea' : 'Pin idea'}
                >
                  <Pin 
                    className="w-4 h-4 transform-gpu transition-transform duration-200" 
                    fill={idea.isPinned ? 'currentColor' : 'none'}
                    style={{
                      transform: idea.isPinned ? 'rotate(45deg)' : 'none'
                    }}
                  />
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
            )}
          </div>

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

        {viewMode === 'list' && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handlePin}
              className={`p-1.5 rounded-lg transition-colors ${
                idea.isPinned
                  ? 'text-primary-600 dark:text-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
              title={idea.isPinned ? 'Unpin idea' : 'Pin idea'}
            >
              <Pin 
                className="w-4 h-4 transform-gpu transition-transform duration-200" 
                fill={idea.isPinned ? 'currentColor' : 'none'}
                style={{
                  transform: idea.isPinned ? 'rotate(45deg)' : 'none'
                }}
              />
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
        )}
      </div>

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