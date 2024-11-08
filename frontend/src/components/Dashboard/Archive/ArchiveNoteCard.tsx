import { FileText, Calendar, Tag, Link2, Star, RotateCcw, Lightbulb } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { useNotes } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';

interface ArchiveNoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

export function ArchiveNoteCard({ note, isSelected, onSelect }: ArchiveNoteCardProps) {
  const { unarchiveNote, loadArchivedNotes } = useNotes();

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unarchiveNote(note.id);
      await loadArchivedNotes(); // Refresh the archive list
    } catch (error) {
      console.error('Failed to unarchive note:', error);
      // You might want to add error handling UI here
    }
  };

  const isIdea = note.isIdea;

  return (
    <div
      onClick={onSelect}
      className={`
        group backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 
        rounded-xl p-4 hover:shadow-md 
        dark:hover:shadow-lg dark:hover:shadow-black/10 transition-all duration-200
        border-2 ${isSelected
          ? 'border-primary-500/70 dark:border-primary-400/70'
          : 'border-gray-200/30 dark:border-gray-700/30 hover:border-gray-200/50 dark:hover:border-gray-700/50'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 text-primary-600 bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isIdea
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                {isIdea ? (
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {note.title}
              </h3>
            </div>
            <button
              onClick={handleUnarchive}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              title="Restore from archive"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {note.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {note.archivedAt && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Archived {formatDate(note.archivedAt)}</span>
              </div>
            )}

            {note.linkedNotes && note.linkedNotes.length > 0 && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Link2 className="w-4 h-4" />
                <span>{note.linkedNotes.length} links</span>
              </div>
            )}

            {note.isFavorite && (
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                <Star className="w-4 h-4" fill="currentColor" />
                <span>Favorite</span>
              </div>
            )}
          </div>

          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-xs"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}