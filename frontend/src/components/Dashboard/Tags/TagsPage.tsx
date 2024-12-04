import { useState, useMemo } from 'react';
import { Tag, ChevronRight, Hash, FileText, Lightbulb, CheckSquare, Search, SlidersHorizontal, Grid, List, Bell } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { useModal } from '../../../contexts/modalContextUtils';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { ReminderCard } from '../Reminders/ReminderCard';
import { IdeaCard } from '../Ideas/IdeaCard';

type ItemType = 'note' | 'task' | 'idea' | 'reminder';

interface TaggedItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: ItemType;
  updatedAt: string;
  createdAt: string;
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
          isIdea: note.isIdea
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
          isIdea: note.isIdea
        })),
      // Tasks
      ...tasks.map(task => ({
        id: task.id,
        title: task.title,
        content: task.description,
        tags: task.tags,
        type: 'task' as ItemType,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt
      })),
      // Reminders
      ...reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        content: reminder.description ?? '',
        tags: reminder.tags,
        type: 'reminder' as ItemType,
        updatedAt: reminder.updatedAt,
        createdAt: reminder.createdAt
      }))
    ];

    return items;
  }, [notes, tasks, reminders]);

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    // First, create the stats map
    const stats = new Map<string, { count: number; byType: Record<ItemType, number> }>();

    allItems.forEach(item => {
      item.tags.forEach(tag => {
        const current = stats.get(tag) || {
          count: 0,
          byType: { note: 0, task: 0, idea: 0, reminder: 0 }
        };
        current.count++;
        current.byType[item.type]++;
        stats.set(tag, current);
      });
    });

    let result = Array.from(stats.entries())
      .map(([tag, stats]) => ({
        tag,
        ...stats
      }));

    // Apply search filter
    if (searchQuery) {
      result = result.filter(item =>
        item.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filters
    if (filters.types.length > 0) {
      result = result.filter(item => {
        // Only show tags that have items of the selected types
        return filters.types.some(type => item.byType[type] > 0);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'count') {
        const diff = b.count - a.count;
        return filters.sortOrder === 'desc' ? diff : -diff;
      } else { // name
        const diff = a.tag.localeCompare(b.tag);
        return filters.sortOrder === 'desc' ? -diff : diff;
      }
    });

    return result;
  }, [allItems, searchQuery, filters.types, filters.sortBy, filters.sortOrder]);

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

  const handleEditNote = (item: TaggedItem) => {
    // Close all modals first
    setSelectedNote(null);
    setSelectedIdea(null);
    setSelectedTask(null);
    setSelectedReminder(null);

    // Then open the appropriate modal
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
          linkedTasks: []
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
          linkedTasks: []
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
          linkedItems: []
        });
        break;
      case 'reminder':
        setSelectedReminder({
          id: item.id,
          title: item.title,
          description: item.content,
          tags: item.tags,
          dueDateTime: item.updatedAt,
          isCompleted: false,
          isSnoozed: false,
          isDeleted: false,
          userId: '',
          updatedAt: item.updatedAt,
          createdAt: item.createdAt
        });
        break;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg">
                  <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tagStats.length} tags • {allItems.filter(item => item.tags.length > 0).length} tagged items
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
            <div className="p-2 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg">
              <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {tagStats.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Tags</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
            <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {allItems.filter(item => item.type === 'note' && item.tags.length > 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tagged Notes</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
            <div className="p-2 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-lg">
              <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {allItems.filter(item => item.type === 'idea' && item.tags.length > 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tagged Ideas</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
            <div className="p-2 bg-green-100/50 dark:bg-green-900/30 rounded-lg">
              <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {allItems.filter(item => item.type === 'task' && item.tags.length > 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tagged Tasks</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
            <div className="p-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg">
              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {allItems.filter(item => item.type === 'reminder' && item.tags.length > 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tagged Reminders</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl min-h-0">
          <div className="h-full flex">
            {/* Tags List Column */}
            <div className="w-[320px] border-r border-gray-200/30 dark:border-gray-700/30 flex flex-col overflow-hidden bg-white/10 dark:bg-gray-800/10 rounded-l-xl">
              {/* Sticky Search and Filters */}
              <div className="sticky top-0 z-10 bg-white/20 dark:bg-gray-800/20 p-3 border-b border-gray-200/30 dark:border-gray-700/30 rounded-tl-xl">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${
                      showFilters
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
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
                  <div className="mt-3 p-3 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded-xl">
                    {/* Type Filters */}
                    <div className="space-y-2 mb-3">
                      <h3 className="text-xs font-medium text-gray-900 dark:text-white">Filter by Type</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setFilters(prev => {
                              const newTypes = prev.types.includes('note')
                                ? prev.types.filter(t => t !== 'note')
                                : [...prev.types, 'note' as ItemType];
                              return { ...prev, types: newTypes };
                            });
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.types.includes('note')
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          <FileText className="w-3 h-3" />
                          Notes
                        </button>

                        <button
                          onClick={() => {
                            setFilters(prev => {
                              const newTypes = prev.types.includes('idea')
                                ? prev.types.filter(t => t !== 'idea')
                                : [...prev.types, 'idea' as ItemType];
                              return { ...prev, types: newTypes };
                            });
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.types.includes('idea')
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          <Lightbulb className="w-3 h-3" />
                          Ideas
                        </button>

                        <button
                          onClick={() => {
                            setFilters(prev => {
                              const newTypes = prev.types.includes('task')
                                ? prev.types.filter(t => t !== 'task')
                                : [...prev.types, 'task' as ItemType];
                              return { ...prev, types: newTypes };
                            });
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.types.includes('task')
                            ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          <CheckSquare className="w-3 h-3" />
                          Tasks
                        </button>

                        <button
                          onClick={() => {
                            setFilters(prev => {
                              const newTypes = prev.types.includes('reminder')
                                ? prev.types.filter(t => t !== 'reminder')
                                : [...prev.types, 'reminder' as ItemType];
                              return { ...prev, types: newTypes };
                            });
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.types.includes('reminder')
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          <Bell className="w-3 h-3" />
                          Reminders
                        </button>
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-900 dark:text-white">Sort by</h3>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            sortBy: 'count',
                            sortOrder: prev.sortBy === 'count' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                          }))}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.sortBy === 'count'
                            ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          Count {filters.sortBy === 'count' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                        </button>

                        <button
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            sortBy: 'name',
                            sortOrder: prev.sortBy === 'name' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                          }))}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${filters.sortBy === 'name'
                            ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-800'
                            : 'bg-white/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                          Name {filters.sortBy === 'name' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Tags List */}
              <div className="flex-1 overflow-y-auto rounded-bl-xl">
                <div className="space-y-0.5 p-2">
                  {tagStats.map(({ tag, byType }) => (
                    <div
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTag === tag
                          ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-gray-800/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className={`w-4 h-4 ${
                          selectedTag === tag
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

                        <ChevronRight className={`w-4 h-4 transition-colors ${
                          selectedTag === tag
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tagged Items View */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedTag ? (
                <div className="flex-1 overflow-y-auto p-4">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredItems.map(item => {
                        switch (item.type) {
                          case 'task':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <TaskCard
                                  key={item.id}
                                  task={{
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
                                    linkedItems: []
                                  }}
                                />
                              </div>
                            );
                          case 'reminder':
                            return (
                              <ReminderCard
                                key={item.id}
                                reminder={{
                                  id: item.id,
                                  title: item.title,
                                  description: item.content,
                                  tags: item.tags,
                                  dueDateTime: item.updatedAt,
                                  isCompleted: false,
                                  isSnoozed: false,
                                  isDeleted: false,
                                  userId: '',
                                  updatedAt: item.updatedAt,
                                  createdAt: item.createdAt
                                }}
                              />
                            );
                          case 'idea':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <IdeaCard
                                  key={item.id}
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
                                    linkedTasks: []
                                  }}
                                />
                              </div>
                            );
                          case 'note':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <NoteCard
                                  key={item.id}
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
                                    linkedTasks: []
                                  }}
                                  viewMode={viewMode}
                                />
                              </div>
                            );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map(item => {
                        switch (item.type) {
                          case 'task':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <TaskCard
                                  key={item.id}
                                  task={{
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
                                    linkedItems: []
                                  }}
                                />
                              </div>
                            );
                          case 'reminder':
                            return (
                              <ReminderCard
                                key={item.id}
                                reminder={{
                                  id: item.id,
                                  title: item.title,
                                  description: item.content,
                                  tags: item.tags,
                                  dueDateTime: item.updatedAt,
                                  isCompleted: false,
                                  isSnoozed: false,
                                  isDeleted: false,
                                  userId: '',
                                  updatedAt: item.updatedAt,
                                  createdAt: item.createdAt
                                }}
                              />
                            );
                          case 'idea':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <IdeaCard
                                  key={item.id}
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
                                    linkedTasks: []
                                  }}
                                />
                              </div>
                            );
                          case 'note':
                            return (
                              <div onClick={() => handleEditNote(item)}>
                                <NoteCard
                                  key={item.id}
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
                                    linkedTasks: []
                                  }}
                                  viewMode={viewMode}
                                />
                              </div>
                            );
                        }
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
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