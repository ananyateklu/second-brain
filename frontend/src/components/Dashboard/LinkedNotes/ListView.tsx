import { useNotes } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { Link2 } from 'lucide-react';

interface ListViewProps {
  onNoteSelect: (noteId: string) => void;
}

export function ListView({ onNoteSelect }: ListViewProps) {
  const { notes } = useNotes();

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <div className="bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-12 px-6 py-3">
            <div className="col-span-5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Linked Notes
              </span>
            </div>
            <div className="col-span-4">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Updated
              </span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className="grid grid-cols-12 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            >
              <div className="col-span-5">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {note.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {note.content}
                </div>
              </div>
              <div className="col-span-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Link2 className="w-4 h-4" />
                  <span>{note.linkedNotes?.length || 0} connections</span>
                </div>
              </div>
              <div className="col-span-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(note.updatedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {notes.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            No notes available
          </p>
        </div>
      )}
    </div>
  );
}