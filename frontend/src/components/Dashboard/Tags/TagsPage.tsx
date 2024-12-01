import { useState, useMemo } from 'react';
import { Tag, ChevronRight, Hash, FileText, Lightbulb, CheckSquare, Search, SlidersHorizontal, Grid, List, Bell } from 'lucide-react';
import { Note, useNotes } from '../../../contexts/NotesContext';
import { useTasks } from '../../../contexts/TasksContext';
import { Reminder, useReminders } from '../../../contexts/RemindersContext';
import { NotesGraph } from '../Notes/NotesGraph';
import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { Task } from '../../../api/types/task';
import { useModal } from '../../../contexts/ModalContext';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { ReminderCard } from '../Reminders/ReminderCard';

type ItemType = 'note' | 'task' | 'idea' | 'reminder';

interface TaggedItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: ItemType;
  updatedAt: string;
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
          isIdea: note.isIdea
        })),
      // Tasks
      ...tasks.map(task => ({
        id: task.id,
        title: task.title,
        content: task.description,
        tags: task.tags,
        type: 'task' as ItemType,
        updatedAt: task.updatedAt
      })),
      // Reminders
      ...reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        content: reminder.description || '',
        tags: reminder.tags,
        type: 'reminder' as ItemType,
        updatedAt: reminder.updatedAt
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

  const getItemIcon = (type: ItemType) => {
    switch (type) {
      case 'note':
        return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'task':
        return <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'idea':
        return <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'reminder':
        return <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Hash className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const convertToNote = (item: TaggedItem): Note => {
    return {
      id: item.id,
      title: item.title,
      content: item.content || '',
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isArchived: false,
      isFavorite: false,
      linkedNoteIds: [],
      type: 'note',
      isIdea: item.tags.includes('idea')
    };
  };


  const handleEditNote = (item: TaggedItem) => {
    switch (item.type) {
      case 'note':
        setSelectedNote(item as Note);
        break;
      case 'idea':
        setSelectedIdea(item as Note);
        break;
      case 'task':
        setSelectedTask(item as Task);
        break;
      case 'reminder':
        setSelectedReminder(item as Reminder);
        break;
    }
  };

  return (
    <div className="h-[calc(100vh-144px)]">
      <div className="h-full flex flex-col space-y-3">
        {/* Header Section */}
        <div className="shrink-0 bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm p-3 rounded-xl">
          <div className="flex flex-col gap-3">
            {/* Title and Stats */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#64ab6f] dark:text-[#64ab6f]" />
                <h1 className="text-base font-semibold text-gray-100 dark:text-gray-100">
                  Tags
                </h1>
              </div>
            </div>

            {/* Stats Grid - Updated to 5 columns */}
            <div className="grid grid-cols-5 gap-1.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Hash className="shrink-0 w-3.5 h-3.5 text-[#64ab6f] dark:text-[#64ab6f]" />
                <div className="text-xs truncate">
                  <span className="text-[#64ab6f] dark:text-[#64ab6f] font-medium">
                    {tagStats.length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-300"> Total Tags</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <FileText className="shrink-0 w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <div className="text-xs truncate">
                  <span className="text-blue-500 dark:text-blue-400 font-medium">
                    {allItems.filter(item => item.type === 'note' && item.tags.length > 0).length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-300"> Tagged Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Lightbulb className="shrink-0 w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <div className="text-xs truncate">
                  <span className="text-amber-500 dark:text-amber-400 font-medium">
                    {allItems.filter(item => item.type === 'idea' && item.tags.length > 0).length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-300"> Tagged Ideas</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <CheckSquare className="shrink-0 w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                <div className="text-xs truncate">
                  <span className="text-purple-500 dark:text-purple-400 font-medium">
                    {allItems.filter(item => item.type === 'task' && item.tags.length > 0).length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-300"> Tagged Tasks</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Bell className="shrink-0 w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <div className="text-xs truncate">
                  <span className="text-rose-500 dark:text-rose-400 font-medium">
                    {allItems.filter(item => item.type === 'reminder' && item.tags.length > 0).length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-300"> Tagged Reminders</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm rounded-xl p-4 min-h-0">
          <div className="h-full flex">
            {/* Tags List Column */}
            <div className="w-[320px] border-r border-[#1C1C1E] dark:border-[#1C1C1E] flex flex-col overflow-hidden bg-[#1C1C1E] dark:bg-[#1C1C1E] rounded-l-xl">
              {/* Sticky Search and Filters */}
              <div className="sticky top-0 z-10 bg-[#1C1C1E] dark:bg-[#1C1C1E] p-3 border-b border-[#1C1C1E] dark:border-[#1C1C1E] rounded-tl-xl">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#64ab6f]/30"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${showFilters
                      ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                      : 'bg-[#2C2C2E] text-gray-400 hover:bg-[#3C3C3E]'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                      ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                      : 'bg-[#2C2C2E] text-gray-400 hover:bg-[#3C3C3E]'
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
                  <div className="mt-3 p-3 bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
                    {/* Type Filters */}
                    <div className="space-y-2 mb-3">
                      <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Filter by Type</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setFilters(prev => {
                              const newTypes = prev.types.includes('note')
                                ? prev.types.filter(t => t !== 'note')
                                : [...prev.types, 'note'];

                              console.log('Updated types:', newTypes); // For debugging

                              return {
                                ...prev,
                                types: newTypes
                              };
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
                            setFilters(prev => ({
                              ...prev,
                              types: prev.types.includes('idea')
                                ? prev.types.filter(t => t !== 'idea')
                                : [...prev.types, 'idea']
                            }));
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
                            setFilters(prev => ({
                              ...prev,
                              types: prev.types.includes('task')
                                ? prev.types.filter(t => t !== 'task')
                                : [...prev.types, 'task']
                            }));
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
                            setFilters(prev => ({
                              ...prev,
                              types: prev.types.includes('reminder')
                                ? prev.types.filter(t => t !== 'reminder')
                                : [...prev.types, 'reminder']
                            }));
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
                      <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200">Sort by</h3>
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
                  {tagStats.map(({ tag, count, byType }) => (
                    <div
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedTag === tag
                        ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                        : 'text-gray-300 hover:bg-[#2C2C2E]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className={`w-4 h-4 ${selectedTag === tag
                          ? 'text-[#64ab6f]'
                          : 'text-gray-400'
                          }`} />
                        <span className="text-sm font-medium">{tag}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Type indicators */}
                        <div className="flex items-center gap-2">
                          {byType.note > 0 && (
                            <span className="flex items-center gap-1 text-xs text-blue-400">
                              <FileText className="w-3.5 h-3.5" />
                              {byType.note}
                            </span>
                          )}
                          {byType.idea > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <Lightbulb className="w-3.5 h-3.5" />
                              {byType.idea}
                            </span>
                          )}
                          {byType.task > 0 && (
                            <span className="flex items-center gap-1 text-xs text-purple-400">
                              <CheckSquare className="w-3.5 h-3.5" />
                              {byType.task}
                            </span>
                          )}
                          {byType.reminder > 0 && (
                            <span className="flex items-center gap-1 text-xs text-rose-400">
                              <Bell className="w-3.5 h-3.5" />
                              {byType.reminder}
                            </span>
                          )}
                        </div>

                        <ChevronRight className={`w-4 h-4 transition-colors ${selectedTag === tag
                          ? 'text-[#64ab6f]'
                          : 'text-gray-500 group-hover:text-gray-400'
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
                <div className="flex-1 overflow-y-auto px-4">
                  <div className={`grid ${viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                    } gap-3 auto-rows-min pb-4`}>
                    {filteredItems.map(item => {
                      switch (item.type) {
                        case 'task':
                          return (
                            <TaskCard
                              key={item.id}
                              task={{
                                id: item.id,
                                title: item.title,
                                description: item.content,
                                tags: item.tags,
                                status: 'In Progress',
                                priority: 'medium',
                                dueDate: null,
                                updatedAt: item.updatedAt,
                                createdAt: item.updatedAt,
                              }}
                            />
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
                                createdAt: item.updatedAt,
                                updatedAt: item.updatedAt,
                              }}
                            />
                          );
                        default: // 'note' or 'idea'
                          return (
                            <NoteCard
                              key={item.id}
                              note={{
                                id: item.id,
                                title: item.title,
                                content: item.content || '',
                                tags: item.tags,
                                createdAt: item.createdAt,
                                updatedAt: item.updatedAt,
                                isArchived: false,
                                isFavorite: false,
                                linkedNoteIds: [],
                                type: 'note',
                                isIdea: item.type === 'idea'
                              }}
                              viewMode={viewMode}
                              onClick={() => handleEditNote(item)}
                            />
                          );
                      }
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Tag className="w-8 h-8 mb-2" />
                  <p>Select a tag to view items</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedNote && <EditNoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />}
      {selectedIdea && <EditIdeaModal ideaId={selectedIdea.id} onClose={() => setSelectedIdea(null)} />}
      {selectedTask && <EditTaskModal taskId={selectedTask.id} onClose={() => setSelectedTask(null)} />}
      {selectedReminder && <EditReminderModal reminder={selectedReminder} onClose={() => setSelectedReminder(null)} />}
    </div>
  );
}

export default TagsPage;