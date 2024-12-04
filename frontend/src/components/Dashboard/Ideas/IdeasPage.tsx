import { useState, useMemo } from 'react';
import { Lightbulb, Plus, Search, Grid, List, Network } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { IdeasList } from './IdeasList';
import { IdeasGrid } from './IdeasGrid';
import { IdeasMindMap } from './IdeasMindMap';
import { NewIdeaModal } from './NewIdeaModal';
import { FilterDropdown } from '../Notes/FilterDropdown';
import { Input } from '../../shared/Input';
import { useModal } from '../../../contexts/modalContextUtils';

type ViewMode = 'list' | 'grid' | 'mindmap';

interface Filters {
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  showPinned: boolean;
  showFavorites: boolean;
  tags: string[];
}

type FilterValue = string | string[] | boolean | 'createdAt' | 'updatedAt' | 'title' | 'asc' | 'desc';

const defaultFilters: Filters = {
  search: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  showPinned: false,
  showFavorites: false,
  tags: []
};

export function IdeasPage() {
  const { notes } = useNotes();
  const { setSelectedIdea } = useModal();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters] = useState(false);
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);

  // Get all ideas and their tags
  const allIdeas = useMemo(() => {
    return notes.filter(note => note.isIdea === true && !note.isArchived);
  }, [notes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(allIdeas.flatMap(idea => idea.tags)));
  }, [allIdeas]);

  // Filter ideas based on current filters
  const filteredIdeas = useMemo(() => {
    return allIdeas
      .filter(idea => {
        const matchesSearch = idea.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          idea.content.toLowerCase().includes(filters.search.toLowerCase());
        const matchesPinned = !filters.showPinned || idea.isPinned;
        const matchesFavorites = !filters.showFavorites || idea.isFavorite;
        const matchesTags = filters.tags.length === 0 ||
          filters.tags.some(tag => idea.tags.includes(tag));

        return matchesSearch && matchesPinned && matchesFavorites && matchesTags;
      })
      .sort((a, b) => {
        const aValue = a[filters.sortBy];
        const bValue = b[filters.sortBy];

        if (filters.sortBy === 'title') {
          return filters.sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return filters.sortOrder === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      });
  }, [allIdeas, filters]);

  const handleFilterChange = (key: keyof Filters, value: FilterValue) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleIdeaClick = (ideaId: string) => {
    const idea = notes.find(note => note.id === ideaId);
    if (idea) {
      setSelectedIdea(idea);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed bg-gradient-to-br from-[var(--color-background)] to-[var(--color-surface)] -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-idea)]/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[var(--color-idea)]/10 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-[var(--color-idea)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)]">Idea Incubator</h1>
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    {allIdeas.length} ideas captured
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewIdeaModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-idea)] hover:bg-[var(--color-idea)]/90 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Idea</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search ideas..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('mindmap')}
              className={`p-2 rounded-lg border border-[var(--color-border)] transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
              }`}
              title="Mind Map View"
            >
              <Network className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
              >
                Clear all
              </button>
            </div>
            
            <FilterDropdown
              filters={filters}
              allTags={allTags}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Ideas Content */}
        <div className="min-h-[500px]">
          {viewMode === 'list' && (
            <IdeasList ideas={filteredIdeas} onIdeaClick={handleIdeaClick} />
          )}
          {viewMode === 'grid' && (
            <IdeasGrid ideas={filteredIdeas} onIdeaClick={handleIdeaClick} />
          )}
          {viewMode === 'mindmap' && (
            <IdeasMindMap ideas={filteredIdeas} onIdeaClick={handleIdeaClick} />
          )}

          {filteredIdeas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Lightbulb className="w-16 h-16 text-[var(--color-textSecondary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
                No ideas found
              </h3>
              <p className="text-[var(--color-textSecondary)] max-w-md">
                {filters.search || filters.tags.length > 0
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Start capturing your ideas! Click the 'New Idea' button to create your first idea."}
              </p>
            </div>
          )}
        </div>

        {/* Modals */}
        <NewIdeaModal
          isOpen={showNewIdeaModal}
          onClose={() => setShowNewIdeaModal(false)}
        />
      </div>
    </div>
  );
}