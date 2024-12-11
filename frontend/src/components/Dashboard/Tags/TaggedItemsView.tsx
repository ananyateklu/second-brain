import { Tag } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { ReminderCard } from '../Reminders/ReminderCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { TaggedItem } from './TagsTypes';
import { cardGridStyles } from '../shared/cardStyles';

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
      <div className="flex-1 overflow-y-auto p-2">
        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Tag className="w-8 h-8 mb-2" />
          <p>Select a tag to view items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="p-0.5">
        {viewMode === 'grid' ? (
          <div className={cardGridStyles}>
            {filteredItems.map(item => renderItem(item, viewMode, onEditItem))}
          </div>
        ) : (
          <div className="space-y-4 px-0.5">
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

  switch (item.type) {
    case 'task':
      return (
        <div key={item.id} onClick={handleClick} className="cursor-pointer w-full">
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
        <ReminderCard
          key={item.id}
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
      );
    case 'idea':
      return (
        <div key={item.id} onClick={handleClick} className="cursor-pointer w-full">
          <IdeaCard
            idea={{
              id: item.id,
              title: item.title,
              content: item.content,
              tags: item.tags,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              isIdea: true,
              isFavorite: false,
              isPinned: false,
              isArchived: false,
              isDeleted: false,
              linkedNoteIds: [],
              linkedTasks: [],
              linkedReminders: []
            }}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
    case 'note':
      return (
        <div key={item.id} onClick={handleClick} className="cursor-pointer w-full">
          <NoteCard
            note={{
              id: item.id,
              title: item.title,
              content: item.content,
              tags: item.tags,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              isIdea: false,
              isFavorite: false,
              isPinned: false,
              isArchived: false,
              isDeleted: false,
              linkedNoteIds: [],
              linkedTasks: [],
              linkedReminders: []
            }}
            viewMode={viewMode}
            onClick={() => onEditItem(item)}
          />
        </div>
      );
  }
} 