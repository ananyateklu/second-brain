import { useState, useMemo } from 'react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { useModal } from '../../../contexts/modalContextUtils';
import { useTagFiltering } from './useTagFiltering';
import { TaggedItem, TagFilters } from './TagsTypes';
import { TagsHeader } from './TagsHeader';
import { TagsList } from './TagsList';
import { TaggedItemsView } from './TaggedItemsView';
import { TagsModals } from './TagsModals';

export function TagsPage() {
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TagFilters>({
    types: [],
    sortBy: 'count',
    sortOrder: 'desc'
  });
  const [viewMode] = useState<'grid' | 'list'>('grid');

  const { selectedNote, selectedIdea, selectedTask, selectedReminder,
    setSelectedNote, setSelectedIdea, setSelectedTask, setSelectedReminder } = useModal();

  // Combine all tagged items
  const allItems = useMemo(() => {
    const items: TaggedItem[] = [
      // Regular notes (excluding ideas)
      ...notes
        .filter(note => !note.isIdea)
        .map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          type: 'note' as const,
          updatedAt: note.updatedAt,
          createdAt: note.createdAt,
          isIdea: note.isIdea,
          linkedItems: [
            ...(note.linkedTasks?.map(task => ({
              id: task.id,
              title: task.title,
              type: 'task' as const,
              createdAt: task.createdAt
            })) || []),
            ...(note.linkedReminders?.map(reminder => ({
              id: reminder.id,
              title: reminder.title,
              type: 'reminder' as const,
              createdAt: reminder.createdAt
            })) || [])
          ]
        })),
      // Ideas (notes with isIdea=true)
      ...notes
        .filter(note => note.isIdea)
        .map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          type: 'idea' as const,
          updatedAt: note.updatedAt,
          createdAt: note.createdAt,
          isIdea: note.isIdea,
          linkedItems: [
            ...(note.linkedTasks?.map(task => ({
              id: task.id,
              title: task.title,
              type: 'task' as const,
              createdAt: task.createdAt
            })) || []),
            ...(note.linkedReminders?.map(reminder => ({
              id: reminder.id,
              title: reminder.title,
              type: 'reminder' as const,
              createdAt: reminder.createdAt
            })) || [])
          ]
        })),
      // Tasks
      ...tasks.map(task => ({
        id: task.id,
        title: task.title,
        content: task.description,
        description: task.description,
        tags: task.tags,
        type: 'task' as const,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
        linkedItems: task.linkedItems?.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
          createdAt: item.createdAt
        })) || []
      })),
      // Reminders
      ...reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        content: reminder.description ?? '',
        description: reminder.description,
        dueDateTime: reminder.dueDateTime,
        repeatInterval: reminder.repeatInterval,
        customRepeatPattern: reminder.customRepeatPattern,
        snoozeUntil: reminder.snoozeUntil,
        isCompleted: reminder.isCompleted,
        isSnoozed: reminder.isSnoozed,
        completedAt: reminder.completedAt,
        tags: reminder.tags,
        linkedItems: reminder.linkedItems || [],
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt,
        userId: reminder.userId,
        isDeleted: reminder.isDeleted,
        deletedAt: reminder.deletedAt,
        type: 'reminder' as const
      }))
    ];

    return items;
  }, [notes, tasks, reminders]);

  // Use the custom hook for tag filtering
  const tagStats = useTagFiltering(allItems, searchQuery, filters);

  // Filter items by selected tag
  const filteredItems = useMemo(() => {
    if (!selectedTag) return [];

    return allItems.filter(item => {
      // First check if the item has the selected tag
      const hasSelectedTag = item.tags.includes(selectedTag);

      // Then check if we should apply type filtering
      const typeFilterApplies = filters.types.length > 0;
      const matchesTypeFilter = filters.types.includes(item.type);

      // Include the item if it has the tag AND either:
      // 1. No type filters are active, OR
      // 2. The item's type matches one of the active filters
      return hasSelectedTag && (!typeFilterApplies || matchesTypeFilter);
    });
  }, [selectedTag, allItems, filters.types]);

  // Update the handleEditNote function with proper types
  const handleEditItem = (item: TaggedItem) => {
    switch (item.type) {
      case 'note':
        setSelectedNote({
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
        });
        break;
      case 'idea':
        setSelectedIdea({
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
        });
        break;
      case 'reminder':
        setSelectedReminder({
          id: item.id,
          title: item.title,
          description: item.content,
          dueDateTime: item.dueDateTime ?? new Date().toISOString(),
          repeatInterval: item.repeatInterval,
          customRepeatPattern: item.customRepeatPattern,
          snoozeUntil: item.snoozeUntil,
          isCompleted: item.isCompleted || false,
          isSnoozed: item.isSnoozed || false,
          completedAt: item.completedAt,
          tags: item.tags,
          linkedItems: item.linkedItems || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          userId: item.userId ?? '',
          isDeleted: item.isDeleted || false,
          deletedAt: item.deletedAt
        });
        break;
      case 'task':
        setSelectedTask({
          id: item.id,
          title: item.title,
          description: item.content,
          tags: item.tags,
          status: 'Incomplete',
          priority: 'medium',
          dueDate: null,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          isDeleted: false,
          linkedItems: item.linkedItems || []
        });
        break;
    }
  };

  return (
    <div className="h-[calc(100vh-9rem)] overflow-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      {/* Main content container */}
      <div className="flex flex-col h-full">
        <div className="px-0.5 mb-2">
          <TagsHeader
            tagStats={tagStats}
            allItemsTagCount={allItems.flatMap(item => item.tags).length}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 mx-0.5 bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 border-[0.5px] border-white/10 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)] ring-1 ring-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="h-full flex">
            <TagsList
              tagStats={tagStats}
              selectedTag={selectedTag}
              searchQuery={searchQuery}
              showFilters={showFilters}
              filters={filters}
              onTagSelect={setSelectedTag}
              onSearchChange={setSearchQuery}
              onToggleFilters={() => setShowFilters(!showFilters)}
              setFilters={setFilters}
            />

            <TaggedItemsView
              selectedTag={selectedTag}
              filteredItems={filteredItems}
              viewMode={viewMode}
              onEditItem={handleEditItem}
            />
          </div>
        </div>
      </div>

      <TagsModals
        selectedNote={selectedNote}
        selectedIdea={selectedIdea}
        selectedTask={selectedTask}
        selectedReminder={selectedReminder}
        onNoteClose={() => setSelectedNote(null)}
        onIdeaClose={() => setSelectedIdea(null)}
        onTaskClose={() => setSelectedTask(null)}
        onReminderClose={() => setSelectedReminder(null)}
      />
    </div>
  );
}

export default TagsPage;