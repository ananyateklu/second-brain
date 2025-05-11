import { useState, useMemo } from 'react';
import { Lightbulb, Plus, Search, SlidersHorizontal, Grid, List, Network, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIdeas } from '../../../contexts/IdeasContext';
import { IdeasMindMap } from './IdeasMindMap';
import { NewIdeaModal } from './NewIdeaModal';
import { FilterDropdown } from '../Notes/FilterDropdown';
import { Input } from '../../shared/Input';
import { useModal } from '../../../contexts/modalContextUtils';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { IdeaCard } from './IdeaCard';
import { DuplicateItemsModal } from '../../shared/DuplicateItemsModal';

type ViewMode = 'list' | 'grid' | 'mindmap';

interface Filters {
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  showPinned: boolean;
  showFavorites: boolean;
  tags: string[];
}

type FilterValue = string | string[] | boolean;

const defaultFilters: Filters = {
  search: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  showPinned: false,
  showFavorites: false,
  tags: []
};

export function IdeasPage() {
  const { state: { ideas } } = useIdeas();
  // TODO: ModalContext needs to be updated for setSelectedIdea to correctly accept an Idea type or be generic.
  const { setSelectedIdea } = useModal();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Get all ideas and their tags
  const allIdeas = useMemo(() => {
    return ideas.filter(idea => !idea.isArchived);
  }, [ideas]);

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

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getViewModeButtonClass = (mode: 'grid' | 'list' | 'mindmap', currentMode: string) => {
    const baseClasses = `
      p-2 rounded-lg 
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
    `;

    if (currentMode === mode) {
      return `${baseClasses} bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300`;
    }

    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const handleIdeaClick = (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      setSelectedIdea(idea);
    }
  };

  const handleDuplicateIdeas = async (selectedIds: string[]) => {
    try {
      // TODO: Implement idea duplication
      console.log('Duplicating ideas:', selectedIds);
    } catch (error) {
      console.error('Failed to duplicate ideas:', error);
    }
  };

  const renderContent = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-4 px-0.5">
          {filteredIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              viewMode="list"
              onClick={() => handleIdeaClick(idea.id)}
            />
          ))}
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className={cardGridStyles}>
          {filteredIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              viewMode="grid"
              onClick={() => handleIdeaClick(idea.id)}
            />
          ))}
        </div>
      );
    }

    return <IdeasMindMap ideas={filteredIdeas} onIdeaClick={handleIdeaClick} />;
  };

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          <div className="flex flex-col sm:flex-row gap-6 justify-between">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-yellow-100/20 dark:bg-yellow-900/20 midnight:bg-yellow-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Idea Incubator</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {allIdeas.length} ideas captured
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    hover:bg-yellow-500/10
                    text-yellow-500 dark:text-yellow-400
                    border border-transparent
                    hover:border-yellow-200/30 dark:hover:border-yellow-700/30
                    transition-colors
                  `}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Duplicate</span>
                </button>

                <button
                  onClick={() => setShowNewIdeaModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    bg-[var(--color-button)]
                    hover:bg-[var(--color-buttonHover)]
                    text-[var(--color-buttonText)]
                    border border-transparent
                    hover:border-gray-200/30 dark:hover:border-gray-700/30
                    transition-colors
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">New Idea</span>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and View Controls */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
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

          <motion.div
            variants={cardVariants}
            className="flex gap-2"
          >
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg 
                border-[0.5px] border-white/10
                ${getContainerBackground()}
                backdrop-blur-xl 
                ring-1 ring-white/5
                hover:bg-[var(--color-surfaceHover)]
                text-[var(--color-text)]
                transition-all duration-200
                hover:-translate-y-0.5
                shadow-sm hover:shadow-md
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-medium text-sm">Filters</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={getViewModeButtonClass('grid', viewMode)}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={getViewModeButtonClass('list', viewMode)}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('mindmap')}
              className={getViewModeButtonClass('mindmap', viewMode)}
              title="Mind Map View"
            >
              <Network className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              p-6
              rounded-2xl
              border-[0.5px] 
              border-white/10
              ${getContainerBackground()}
              backdrop-blur-xl 
              ring-1 ring-white/5
              shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
              dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
              transition-all 
              duration-300
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100/20 dark:bg-yellow-900/20 midnight:bg-yellow-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>

            <FilterDropdown
              filters={filters}
              allTags={allTags}
              onFilterChange={handleFilterChange}
            />
          </motion.div>
        )}

        {/* Ideas Content */}
        <motion.div
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
            min-h-[500px]
          `}
        >
          {filteredIdeas.length > 0 ? (
            renderContent()
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Lightbulb className="w-16 h-16 text-yellow-400/50 dark:text-yellow-500/30 mb-4" />
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
        </motion.div>

        {/* Modals */}
        <NewIdeaModal
          isOpen={showNewIdeaModal}
          onClose={() => setShowNewIdeaModal(false)}
        />

        <DuplicateItemsModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          items={filteredIdeas}
          onDuplicate={handleDuplicateIdeas}
          itemType="idea"
        />
      </div>
    </div>
  );
}