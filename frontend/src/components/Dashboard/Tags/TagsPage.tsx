import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, Hash, FileText, Lightbulb, CheckSquare, Search, SlidersHorizontal, Grid, List, Bell } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { useTasks } from '../../../contexts/TasksContext';
import { useReminders } from '../../../contexts/RemindersContext';
import { NotesGraph } from '../Notes/NotesGraph';
import { Input } from '../../shared/Input';

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
  const navigate = useNavigate();
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
          updatedAt: note.updatedAt
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
          updatedAt: note.updatedAt
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

    // Apply sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'count') {
        return filters.sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
      }
      return filters.sortOrder === 'desc' 
        ? b.tag.localeCompare(a.tag) 
        : a.tag.localeCompare(b.tag);
    });

    if (searchQuery) {
      result = result.filter(item => 
        item.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [allItems, filters.sortBy, filters.sortOrder, searchQuery]);

  // Filter items by selected tag
  const filteredItems = useMemo(() => {
    if (!selectedTag) return [];
    
    return allItems
      .filter(item => {
        const matchesTag = item.tags.includes(selectedTag);
        const matchesType = filters.types.length === 0 || filters.types.includes(item.type);
        return matchesTag && matchesType;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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

  const handleItemClick = (item: TaggedItem) => {
    switch (item.type) {
      case 'note':
        navigate(`/dashboard/notes/${item.id}`);
        break;
      case 'task':
        navigate(`/dashboard/tasks/${item.id}`);
        break;
      case 'idea':
        navigate(`/dashboard/ideas/${item.id}`);
        break;
      case 'reminder':
        navigate(`/dashboard/reminders/${item.id}`);
        break;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 mb-6">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Tag className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tagStats.length} tags
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="shrink-0 flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Input
            label="Search"
            icon={Search}
            type="text"
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tags List Column */}
          <div className="lg:col-span-1 h-full flex flex-col backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
            <div className="shrink-0 p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Tags</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tagStats.map(({ tag, count, byType }) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 border-b border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm ${
                    selectedTag === tag
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

          {/* Tagged Items Column */}
          <div className="lg:col-span-2 h-full flex flex-col backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
            {selectedTag ? (
              <div className="h-full flex flex-col">
                <div className="shrink-0 flex justify-between items-center p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Items tagged with "{selectedTag}"
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'list'
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="List View"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
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
                          onClick={() => handleItemClick(item)}
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
                          if (item) handleItemClick(item);
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200">
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
    </div>
  );
}

export default TagsPage;