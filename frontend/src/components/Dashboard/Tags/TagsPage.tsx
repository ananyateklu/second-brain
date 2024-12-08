import { useState, useMemo } from 'react';
import { Tag, ChevronRight, Hash, FileText, Lightbulb, CheckSquare, Search, SlidersHorizontal, Grid, List, Bell } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal/index';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { useModal } from '../../../contexts/modalContextUtils';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { ReminderCard } from '../Reminders/ReminderCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { useTagFiltering } from './useTagFiltering';
import { FiltersPanel } from './FiltersPanel';
import { ItemType } from './types';
import { cardGridStyles } from '../shared/cardStyles';
import { TaskStatus, TaskPriority } from '../../../api/types/task';

// Define interfaces before the component
interface LinkedItem {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

interface ReminderProperties {
  dueDateTime: string;
  repeatInterval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  customRepeatPattern?: string;
  snoozeUntil?: string;
  isCompleted: boolean;
  isSnoozed: boolean;
  completedAt?: string;
  linkedItems: LinkedItem[];
  userId: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// Define TaggedItem interface with all required properties
interface TaggedItem extends Partial<ReminderProperties> {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: ItemType;
  updatedAt: string;
  createdAt: string;
  isIdea?: boolean;
  linkedItems?: LinkedItem[];
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  description?: string;
}

export function TagsPage() {
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as ItemType[],
    sortBy: 'count' as 'count' | 'name',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
          type: 'note' as ItemType,
          updatedAt: note.updatedAt,
          createdAt: note.createdAt,
          isIdea: note.isIdea,
          linkedItems: [
            ...(note.linkedTasks?.map(task => ({
              id: task.id,
              title: task.title,
              type: 'task',
              createdAt: task.createdAt
            })) || []),
            ...(note.linkedReminders?.map(reminder => ({
              id: reminder.id,
              title: reminder.title,
              type: 'reminder',
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
          type: 'idea' as ItemType,
          updatedAt: note.updatedAt,
          createdAt: note.createdAt,
          isIdea: note.isIdea,
          linkedItems: [
            ...(note.linkedTasks?.map(task => ({
              id: task.id,
              title: task.title,
              type: 'task',
              createdAt: task.createdAt
            })) || []),
            ...(note.linkedReminders?.map(reminder => ({
              id: reminder.id,
              title: reminder.title,
              type: 'reminder',
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
        type: 'task' as ItemType,
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
        type: 'reminder' as ItemType
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
  const handleEditNote = (item: TaggedItem) => {
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
      <div className="flex flex-col h-full p-0.5">
        {/* Header - make more compact */}
        <div className="flex-none relative overflow-hidden rounded-lg bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm mb-2">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent" />
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-100/50 dark:bg-cyan-900/30 rounded-lg">
                  <Hash className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
              </div>

              {/* View Toggle Buttons - make more compact */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${viewMode === 'grid'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                    }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${viewMode === 'list'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                    }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stats Row - even more compact */}
            <div className="flex gap-3 text-sm mt-3">
              <div className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{tagStats.length}</span>
                <span className="text-gray-600 dark:text-gray-400">Tags</span>
                <span className="text-gray-400 dark:text-gray-500 mx-0.5">•</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{allItems.flatMap(item => item.tags).length}</span>
                <span className="text-gray-600 dark:text-gray-400">Total Uses</span>
              </div>

              <div className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-600 dark:text-cyan-400">{tagStats.reduce((sum, tag) => sum + tag.byType.note, 0)}</span>
                <span className="text-gray-600 dark:text-gray-400">Notes</span>
              </div>

              <div className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium text-yellow-600 dark:text-yellow-400">{tagStats.reduce((sum, tag) => sum + tag.byType.idea, 0)}</span>
                <span className="text-gray-600 dark:text-gray-400">Ideas</span>
              </div>

              <div className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-600 dark:text-green-400">{tagStats.reduce((sum, tag) => sum + tag.byType.task, 0)}</span>
                <span className="text-gray-600 dark:text-gray-400">Tasks</span>
              </div>

              <div className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-600 dark:text-purple-400">{tagStats.reduce((sum, tag) => sum + tag.byType.reminder, 0)}</span>
                <span className="text-gray-600 dark:text-gray-400">Reminders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl overflow-hidden">
          <div className="h-full flex">
            {/* Tags List Column - adjust width and padding */}
            <div className="w-[320px] border-r border-gray-200/30 dark:border-gray-700/30 flex flex-col bg-white/10 dark:bg-gray-800/10 rounded-l-xl">
              {/* Search and filters - add more padding */}
              <div className="flex-none sticky top-0 z-10 bg-white/20 dark:bg-gray-800/20 p-2 border-b border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center gap-0.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${showFilters
                      ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                      }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                      ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                      }`}
                  >
                    {viewMode === 'grid' ? (
                      <List className="w-4 h-4" />
                    ) : (
                      <Grid className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <FiltersPanel filters={filters} setFilters={setFilters} />
                )}
              </div>

              {/* Tags list - add more padding */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {tagStats.map(({ tag, byType }) => (
                    <div
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${selectedTag === tag
                          ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-gray-800/20'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className={`w-4 h-4 ${selectedTag === tag
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-400 dark:text-gray-500'
                          }`} />
                        <span className="text-sm font-medium">{tag}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Type indicators */}
                        <div className="flex items-center gap-2">
                          {byType.note > 0 && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <FileText className="w-3.5 h-3.5" />
                              {byType.note}
                            </span>
                          )}
                          {byType.idea > 0 && (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                              <Lightbulb className="w-3.5 h-3.5" />
                              {byType.idea}
                            </span>
                          )}
                          {byType.task > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckSquare className="w-3.5 h-3.5" />
                              {byType.task}
                            </span>
                          )}
                          {byType.reminder > 0 && (
                            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                              <Bell className="w-3.5 h-3.5" />
                              {byType.reminder}
                            </span>
                          )}
                        </div>

                        <ChevronRight className={`w-4 h-4 transition-colors ${selectedTag === tag
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                          }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tagged Items View - add padding */}
            <div className="flex-1 overflow-y-auto p-2">
              {selectedTag ? (
                <div className="p-0.5">
                  {viewMode === 'grid' ? (
                    <div className={cardGridStyles}>
                      {filteredItems.map(item => {
                        switch (item.type) {
                          case 'task':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  onClick={() => handleEditNote(item)}
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
                                onClick={() => handleEditNote(item)}
                              />
                            );
                          case 'idea':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  viewMode="grid"
                                />
                              </div>
                            );
                          case 'note':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  viewMode="grid"
                                />
                              </div>
                            );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4 px-0.5">
                      {filteredItems.map(item => {
                        switch (item.type) {
                          case 'task':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  onClick={() => handleEditNote(item)}
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
                                onClick={() => handleEditNote(item)}
                              />
                            );
                          case 'idea':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  viewMode="list"
                                />
                              </div>
                            );
                          case 'note':
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(item);
                                }}
                                className="cursor-pointer w-full"
                              >
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
                                  viewMode="list"
                                />
                              </div>
                            );
                        }
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <Tag className="w-8 h-8 mb-2" />
                  <p>Select a tag to view items</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedNote && (
        <EditNoteModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          isOpen={!!selectedNote}
        />
      )}
      {selectedIdea && (
        <EditIdeaModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          isOpen={!!selectedIdea}
        />
      )}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          isOpen={!!selectedTask}
        />
      )}
      {selectedReminder && (
        <EditReminderModal
          reminder={selectedReminder}
          onClose={() => setSelectedReminder(null)}
          isOpen={!!selectedReminder}
        />
      )}
    </div>
  );
}

export default TagsPage;