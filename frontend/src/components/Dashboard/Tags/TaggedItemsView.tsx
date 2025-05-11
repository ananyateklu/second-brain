import { Tag } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { ReminderCard } from '../Reminders/ReminderCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { TaggedItem } from './TagsTypes';
import { cardGridStyles } from '../shared/cardStyles';
import { Idea } from '../../../types/idea';

interface TaggedItemsViewProps {
  selectedTag: string | null;
  filteredItems: TaggedItem[];
  viewMode: 'grid' | 'list';
  onEditItem: (item: TaggedItem) => void;
}

export function TaggedItemsView({
  selectedTag,
  filteredItems,
  viewMode,
  onEditItem,
}: TaggedItemsViewProps) {
  if (!selectedTag) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-xl bg-white/5 dark:bg-gray-900/20 midnight:bg-[#0f172a]/20 ring-1 ring-white/10 backdrop-blur-xl">
            <Tag className="w-8 h-8 text-[var(--color-textSecondary)]" />
          </div>
          <p className="text-sm text-[var(--color-textSecondary)]">Select a tag to view items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 backdrop-blur-xl">
      <div className="p-0.5">
        {viewMode === 'grid' ? (
          <div className={`${cardGridStyles} gap-4`}>
            {filteredItems.map(item => renderItem(item, viewMode, onEditItem))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => renderItem(item, viewMode, onEditItem))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderItem(item: TaggedItem, viewMode: 'grid' | 'list', onEditItem: (item: TaggedItem) => void) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditItem(item);
  };

  const wrapperClasses = "cursor-pointer w-full transition-transform duration-200 hover:-translate-y-0.5";

  // Create an Idea object for IdeaCard component if needed
  let ideaItem: Idea | null = null;
  if (item.type === 'idea') {
    ideaItem = {
      id: item.id,
      title: item.title,
      content: item.content,
      tags: item.tags,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      isFavorite: false,
      isPinned: false,
      isArchived: false,
      isDeleted: false,
      linkedItems: item.linkedItems?.map(linkedItem => ({
        id: linkedItem.id,
        title: linkedItem.title,
        type: linkedItem.type.charAt(0).toUpperCase() + linkedItem.type.slice(1) as 'Note' | 'Idea' | 'Task' | 'Reminder'
      })) || []
    };
  }

  switch (item.type) {
    case 'task':
      return (
        <div key={item.id} onClick={handleClick} className={wrapperClasses}>
          <TaskCard
            task={{
              id: item.id,
              title: item.title,
              description: item.content,
              tags: item.tags,
              status: item.status ?? 'Incomplete',
              priority: item.priority ?? 'medium',
              dueDate: item.dueDate ?? null,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              isDeleted: false,
              linkedItems: item.linkedItems || []
            }}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
    case 'reminder':
      return (
        <div key={item.id} className={wrapperClasses}>
          <ReminderCard
            reminder={{
              ...item,
              description: item.content || '',
              dueDateTime: item.dueDateTime ?? new Date().toISOString(),
              isCompleted: item.isCompleted || false,
              isSnoozed: item.isSnoozed || false,
              isDeleted: item.isDeleted || false,
              userId: item.userId ?? '',
              repeatInterval: item.repeatInterval,
              linkedItems: item.linkedItems || []
            }}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
    case 'idea':
      return (
        <div key={item.id} onClick={handleClick} className={wrapperClasses}>
          <IdeaCard
            idea={ideaItem!}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
    case 'note':
      return (
        <div key={item.id} onClick={handleClick} className={wrapperClasses}>
          <NoteCard
            note={{
              id: item.id,
              title: item.title,
              content: item.content,
              tags: item.tags,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              isFavorite: false,
              isPinned: false,
              isArchived: false,
              isDeleted: false,
              linkedNoteIds: [],
              linkedTasks: [],
              linkedReminders: [],
              links: []
            }}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
  }
} 