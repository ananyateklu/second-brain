import { Star, Link2, Tag, Lightbulb, Archive, Pin, CheckSquare, Clock } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { useNotes } from '../../../contexts/NotesContext';
import { useState } from 'react';
import { WarningModal } from '../../shared/WarningModal';

interface IdeaCardProps {
  idea: Note;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  isArchiveView?: boolean;
}

export function IdeaCard({ idea, viewMode = 'grid', isSelected, isArchiveView }: IdeaCardProps) {
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
      <div className={`
        bg-[#1C1C1E] dark:bg-[#1C1C1E]
        border border-[#2C2C2E] dark:border-[#2C2C2E]
        shadow-sm hover:shadow-md
        p-4 rounded-xl
        hover:border-[#64ab6f] dark:hover:border-[#64ab6f]
        transition-all duration-200
        ${idea.isPinned && idea.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${idea.isPinned && !idea.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${!idea.isPinned && idea.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${viewMode === 'list' ? 'flex items-start gap-4' : 'flex flex-col'}
        ${isSelected ? 'border-[#64ab6f]' : ''}
      `}>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-1.5 rounded-lg bg-amber-900/30 dark:bg-amber-900/30">
                <Lightbulb className="w-4 h-4 text-amber-400 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-200 dark:text-gray-200">
                  {idea.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-400 line-clamp-2">
                  {idea.content}
                </p>
              </div>
            </div>

            {!isArchiveView && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePin}
                  className={`p-1.5 rounded-lg transition-colors ${idea.isPinned
                    ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                    : 'text-gray-400 hover:text-[#64ab6f] hover:bg-[#2C2C2E]'
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
                  className={`p-1.5 rounded-lg transition-colors ${idea.isFavorite
                    ? 'text-amber-400 bg-amber-900/30'
                    : 'text-gray-400 hover:text-amber-400 hover:bg-[#2C2C2E]'
                    }`}
                  title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className="w-4 h-4" fill={idea.isFavorite ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={handleArchiveClick}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-[#2C2C2E] transition-colors"
                  title="Archive idea"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {idea.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {idea.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#64ab6f]/10 text-[#64ab6f] rounded-full text-xs border border-[#64ab6f]/20"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-3">
              {idea.linkedNoteIds && idea.linkedNoteIds.length > 0 && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  <span>{idea.linkedNoteIds.length} notes</span>
                </div>
              )}
              {idea.linkedTasks && idea.linkedTasks.length > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-purple-400" />
                  <span>{idea.linkedTasks.length} tasks</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(idea.updatedAt)}</span>
            </div>
          </div>
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