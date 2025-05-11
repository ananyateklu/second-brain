import { useNotes } from '../../../contexts/notesContextUtils';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { formatDate } from '../../../utils/dateUtils';
import { Link2, Type, Lightbulb, Calendar, Hash } from 'lucide-react';
import { Note } from '../../../types/note';
import { Idea } from '../../../types/idea';

interface ListViewProps {
  onNoteSelect: (noteId: string) => void;
}

const NoteCard = ({ note, onClick }: { note: Note | Idea; onClick: () => void }) => {
  // Check if note is an Idea by checking if it has linkedItems which only exists on Idea type
  const isIdea = 'linkedItems' in note;
  const tags = note.tags || [];
  const connectionCount = 'linkedNoteIds' in note ? note.linkedNoteIds.length :
    'linkedItems' in note ? note.linkedItems.length : 0;

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface)]/40 rounded-lg p-4 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isIdea ? (
            <div className="p-1 rounded-md bg-amber-500/10 dark:bg-amber-500/20">
              <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
          ) : (
            <div className="p-1 rounded-md bg-blue-500/10 dark:bg-blue-500/20">
              <Type className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
          )}
          <h3 className="font-medium text-[var(--color-text)] truncate">{note.title}</h3>
        </div>

        <div className="flex items-center gap-1 text-[var(--color-textSecondary)]">
          <Link2 className="w-3.5 h-3.5" />
          <span className="text-xs">{connectionCount}</span>
        </div>
      </div>

      <div className="mt-2 text-sm text-[var(--color-textSecondary)] line-clamp-2">
        {note.content || "No content"}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(note.updatedAt || note.createdAt)}</span>
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {tags.slice(0, 2).map(tag => (
              <div key={tag} className="flex items-center gap-0.5 bg-[var(--color-surface)]/30 rounded px-1.5 py-0.5">
                <Hash className="w-2.5 h-2.5 text-[var(--color-textSecondary)]" />
                <span className="text-xs text-[var(--color-textSecondary)]">{tag}</span>
              </div>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-[var(--color-textSecondary)]">+{tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export function ListView({ onNoteSelect }: ListViewProps) {
  const { notes } = useNotes();
  const { state: { ideas } } = useIdeas();

  // Combine notes and ideas for display
  const allItems = [...notes, ...ideas];

  const sortedItems = [...allItems].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt;
    const dateB = b.updatedAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedItems.map((item) => (
          <NoteCard
            key={item.id}
            note={item}
            onClick={() => onNoteSelect(item.id)}
          />
        ))}
      </div>

      {allItems.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Link2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[var(--color-textSecondary)]">
              No connected notes to display
            </p>
          </div>
        </div>
      )}
    </div>
  );
}