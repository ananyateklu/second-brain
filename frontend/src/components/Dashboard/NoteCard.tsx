import { useState } from 'react';
import { Clock, Tag as TagIcon, Star, Pin, FileText, Lightbulb, Archive, Link2 } from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { WarningModal } from '../shared/WarningModal';
import { textStyles } from '../../utils/textUtils';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isIdea: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds: string[];
  linkedNotes?: Note[];
}

interface NoteCardProps {
  note: Note;
  viewMode?: 'grid' | 'list';
}

export function NoteCard({ note, viewMode = 'grid' }: NoteCardProps) {
  const { togglePinNote, toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  if (!note) return null;

  const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const isIdea = note.isIdea;
  const hasLinks = note.linkedNoteIds && note.linkedNoteIds.length > 0;
  const tags = Array.isArray(note.tags) ? note.tags : [];

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

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinNote(note.id);
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
          ${note.isPinned && note.isFavorite ? 'ring-1 ring-purple-500/20 ring-amber-500/20' : ''}
          ${note.isPinned ? 'ring-1 ring-primary-500/20' : ''}
          ${note.isFavorite ? 'ring-1 ring-amber-500/20' : ''}
          ${viewMode === 'list' ? 'flex gap-4' : ''}
        `}
        style={{
          isolation: 'isolate',
        }}
      >

        <div className="relative flex-1 flex flex-col min-h-[120px]">
          {/* Main content section */}
          <div className="flex items-start justify-between gap-4 flex-grow">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${
                isIdea
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {isIdea ? (
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors">
                  {note.title}
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                  {note.content}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePin(e);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  note.isPinned
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin 
                  className="w-4 h-4 transform-gpu transition-transform duration-200" 
                  fill={note.isPinned ? 'currentColor' : 'none'}
                />
              </button>

              <button
                onClick={handleFavorite}
                className={`p-1.5 rounded-lg transition-colors ${note.isFavorite
                  ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
                title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className="w-4 h-4" fill={note.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleArchiveClick}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                title="Archive note"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom section with consistent spacing */}
          <div className="mt-auto space-y-3">
            {/* Tags section - wrapped in a div with consistent height */}
            <div className="min-h-[28px]">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      +{tags.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Metadata section */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {hasLinks && (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  <span>{note.linkedNoteIds?.length || 0} connections</span>
                </div>
              )}
              <span>{formattedDate}</span>
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