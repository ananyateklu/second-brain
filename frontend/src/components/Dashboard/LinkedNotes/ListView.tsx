import { useMemo } from 'react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { formatDate } from '../../../utils/dateUtils';
import { Link2, Type, Lightbulb, Calendar, Hash, CheckSquare } from 'lucide-react';
import { Task } from '../../../types/task';

interface ListViewProps {
  onItemSelect: (itemId: string, itemType: 'note' | 'idea' | 'task') => void;
}

interface DisplayItem {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt?: string | null;
  tags: string[];
  itemType: 'note' | 'idea' | 'task';
  connectionCount: number;
}

const ItemDisplayCard = ({ item, onClick }: { item: DisplayItem; onClick: () => void }) => {
  const { itemType, tags, connectionCount } = item;

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface)]/40 rounded-lg p-4 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {itemType === 'idea' ? (
            <div className="p-1 rounded-md bg-amber-500/10 dark:bg-amber-500/20">
              <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
          ) : itemType === 'task' ? (
            <div className="p-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20">
              <CheckSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="p-1 rounded-md bg-blue-500/10 dark:bg-blue-500/20">
              <Type className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
          )}
          <h3 className="font-medium text-[var(--color-text)] truncate">{item.title}</h3>
        </div>

        <div className="flex items-center gap-1 text-[var(--color-textSecondary)]">
          <Link2 className="w-3.5 h-3.5" />
          <span className="text-xs">{connectionCount}</span>
        </div>
      </div>

      <div className="mt-2 text-sm text-[var(--color-textSecondary)] line-clamp-2">
        {item.content || (itemType === 'task' ? (item as unknown as Task).description : "No content")}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(item.updatedAt || item.createdAt)}</span>
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

export function ListView({ onItemSelect }: ListViewProps) {
  const { notes } = useNotes();
  const { state: { ideas } } = useIdeas();
  const { tasks } = useTasks();

  const allDisplayItems: DisplayItem[] = useMemo(() => {
    const mappedNotes: DisplayItem[] = notes.map(note => ({
      ...note,
      itemType: 'note',
      connectionCount: note.linkedNoteIds?.length || 0,
    }));
    const mappedIdeas: DisplayItem[] = ideas.map(idea => ({
      ...idea,
      itemType: 'idea',
      connectionCount: idea.linkedItems?.length || 0,
    }));
    const mappedTasks: DisplayItem[] = tasks.map(task => ({
      ...task,
      itemType: 'task',
      content: task.description,
      connectionCount: task.linkedItems?.length || 0,
    }));
    return [...mappedNotes, ...mappedIdeas, ...mappedTasks];
  }, [notes, ideas, tasks]);

  const sortedItems = [...allDisplayItems].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedItems.map((item) => (
          <ItemDisplayCard
            key={`${item.itemType}-${item.id}`}
            item={item}
            onClick={() => onItemSelect(item.id, item.itemType)}
          />
        ))}
      </div>

      {sortedItems.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Link2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[var(--color-textSecondary)]">
              No items to display in list view
            </p>
          </div>
        </div>
      )}
    </div>
  );
}