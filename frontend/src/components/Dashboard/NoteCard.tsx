import { useState } from 'react';
import { Clock, Tag as TagIcon, Star, Pin, FileText, Archive, Link2, CheckSquare } from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { WarningModal } from '../shared/WarningModal';
import { formatDate } from '../../utils/dateUtils';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isIdea: boolean;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds?: string[];
  linkedTasks?: string[];
}

interface NoteCardProps {
  note: Note;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
}

export function NoteCard({ note, viewMode = 'grid' }: NoteCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinNote(note.id);
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
      await archiveNote(note.id);
      setShowArchiveWarning(false);
    } catch (error) {
      console.error('Failed to archive note:', error);
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
        ${note.isPinned && note.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${note.isPinned && !note.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${!note.isPinned && note.isFavorite ? 'bg-[#1A1A1D]' : ''}
        ${viewMode === 'list' ? 'flex items-start gap-4' : 'flex flex-col'}
      `}>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-1.5 rounded-lg bg-blue-900/30 dark:bg-blue-900/30">
                <FileText className="w-4 h-4 text-blue-400 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-200 dark:text-gray-200">
                  {note.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-400 line-clamp-2">
                  {note.content}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handlePin}
                className={`p-1.5 rounded-lg transition-colors ${note.isPinned
                  ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                  : 'text-gray-400 hover:text-[#64ab6f] hover:bg-[#2C2C2E]'
                  }`}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin
                  className="w-4 h-4 transform-gpu transition-transform duration-200"
                  fill={note.isPinned ? 'currentColor' : 'none'}
                  style={{
                    transform: note.isPinned ? 'rotate(45deg)' : 'none'
                  }}
                />
              </button>

              <button
                onClick={handleFavorite}
                className={`p-1.5 rounded-lg transition-colors ${note.isFavorite
                  ? 'text-amber-400 bg-amber-900/30'
                  : 'text-gray-400 hover:text-amber-400 hover:bg-[#2C2C2E]'
                  }`}
                title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className="w-4 h-4" fill={note.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleArchiveClick}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-[#2C2C2E] transition-colors"
                title="Archive note"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#64ab6f]/10 text-[#64ab6f] rounded-full text-xs border border-[#64ab6f]/20"
                >
                  <TagIcon className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-3">
              {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  <span>{note.linkedNoteIds.length} notes</span>
                </div>
              )}
              {note.linkedTasks && note.linkedTasks.length > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-purple-400" />
                  <span>{note.linkedTasks.length} tasks</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(note.updatedAt)}</span>
            </div>
          </div>
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