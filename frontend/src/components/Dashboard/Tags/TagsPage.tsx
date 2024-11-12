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
  }, [notes, tasks, reminders ]);

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
    <div className="space-y-3">
      {/* Header Section */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm p-3 rounded-xl">
        <div className="flex flex-col gap-3">
          {/* Title and Stats */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-600 dark:text-primary-500" />
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                Tags
              </h1>
            </div>
          </div>

          {/* Stats Grid - Updated to 5 columns */}
          <div className="grid grid-cols-5 gap-1.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Hash className="shrink-0 w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              <div className="text-xs truncate">
                <span className="text-primary-600 dark:text-primary-400 font-medium">
                  {tagStats.length}
                </span>
                <span className="text-gray-700 dark:text-gray-300"> Total Tags</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <FileText className="shrink-0 w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <div className="text-xs truncate">
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {allItems.filter(item => item.type === 'note' && item.tags.length > 0).length}
                </span>
                <span className="text-gray-700 dark:text-gray-300"> Tagged Notes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Lightbulb className="shrink-0 w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs truncate">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {allItems.filter(item => item.type === 'idea' && item.tags.length > 0).length}
                </span>
                <span className="text-gray-700 dark:text-gray-300"> Tagged Ideas</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <CheckSquare className="shrink-0 w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <div className="text-xs truncate">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {allItems.filter(item => item.type === 'task' && item.tags.length > 0).length}
                </span>
                <span className="text-gray-700 dark:text-gray-300"> Tagged Tasks</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Bell className="shrink-0 w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <div className="text-xs truncate">
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  {allItems.filter(item => item.type === 'reminder' && item.tags.length > 0).length}
                </span>
                <span className="text-gray-700 dark:text-gray-300"> Tagged Reminders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm rounded-xl">
        <div className="h-[calc(100vh-250px)] flex">
          {/* Tags List Column */}
          <div className="w-[320px] border-r border-gray-200/50 dark:border-gray-700/30 flex flex-col">
            {/* Search and Filters Header */}
            <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white/50 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 transition-all ${showFilters
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-700/50'
                      : 'bg-white/50 dark:bg-gray-800/70 hover:bg-white/70 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-3 p-3 bg-white/30 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-lg">
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

            {/* Rest of the tags list */}
            <div className="flex-1 overflow-y-auto">
              {tagStats.map(({ tag, count, byType }) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 border-b border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm ${selectedTag === tag
                      ? 'bg-primary-50/70 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-lg'
                      : 'bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>{tag}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {byType.note > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          {byType.note}
                        </span>
                      )}
                      {byType.task > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-green-600 dark:text-green-400" />
                          {byType.task}
                        </span>
                      )}
                      {byType.idea > 0 && (
                        <span className="flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {byType.idea}
                        </span>
                      )}
                      {byType.reminder > 0 && (
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          {byType.reminder}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tagged Items View */}
          <div className="flex-1 flex flex-col">
            {selectedTag ? (
              <>
                {/* Selected Tag Header */}
                <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Items tagged with "{selectedTag}"
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all ${viewMode === 'grid'
                            ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                          }`}
                        title="Grid View"
                      >
                        <Grid className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all ${viewMode === 'list'
                            ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                          }`}
                        title="List View"
                      >
                        <List className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleEditNote(item)}
                          className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 hover:bg-white/70 dark:hover:bg-gray-800/70 cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getItemIcon(item.type)}
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-3">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-2">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50/70 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                      {filteredItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleEditNote(item)}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getItemIcon(item.type)}
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 ml-6">
                            {item.content}
                          </p>
                          <div className="mt-3 flex items-center gap-2 ml-6">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full">
                      <NotesGraph
                        notes={filteredItems.filter(item => item.type === 'note')}
                        onNoteClick={(noteId) => {
                          const item = filteredItems.find(item => item.id === noteId);
                          if (item) handleEditNote(item);
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Tag className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a tag to view related items
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedTask && (
        <EditTaskModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
        />
      )}

      {selectedReminder && (
        <EditReminderModal
          isOpen={!!selectedReminder}
          onClose={() => setSelectedReminder(null)}
          reminder={selectedReminder}
        />
      )}

      {selectedNote && (
        <EditNoteModal
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          note={selectedNote}
        />
      )}

      {selectedIdea && (
        <EditIdeaModal
          isOpen={!!selectedIdea}
          onClose={() => setSelectedIdea(null)}
          idea={selectedIdea}
        />
      )}
    </div>
  );
}

export default TagsPage;