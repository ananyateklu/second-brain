import { useState, useEffect, useCallback, memo } from 'react';
import { Archive, Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotes } from '../../../contexts/notesContextUtils';
import { ArchiveList } from './ArchiveList';
import { ArchiveFilters } from './ArchiveFilters';
import { Input } from '../../shared/Input';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';

export const ArchivePage = memo(function ArchivePage() {
  const { archivedNotes, restoreMultipleNotes, isLoading, loadArchivedNotes } = useNotes();
  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    sortBy: 'archivedAt' as 'archivedAt' | 'updatedAt' | 'title',
    sortOrder: 'desc' as 'asc' | 'desc',
    tags: [] as string[],
    hasLinks: false
  });

  // Load archived notes once on mount
  useEffect(() => {
    console.log('[Archive] Loading archived notes if needed');
    loadArchivedNotes().catch(error => {
      console.error('[Archive] Failed to load archived notes:', error);
    });
  }, [loadArchivedNotes]); // Empty dependency array since loadArchivedNotes is now stable

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  }, []);

  const handleRestoreSelected = useCallback(async () => {
    if (selectedItems.length === 0) return;

    try {
      await restoreMultipleNotes(selectedItems);
      setSelectedItems([]);
    } catch (error) {
      console.error('Failed to restore selected notes:', error);
    }
  }, [selectedItems, restoreMultipleNotes]);

  const getContainerBackground = useCallback(() => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  }, [theme]);

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
        {/* Archive Header */}
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
              <div className="p-2.5 bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <Archive className="w-6 h-6 text-blue-600 dark:text-blue-400 midnight:text-blue-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Archive</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {isLoading ? (
                    <span className="inline-flex items-center">
                      <span className="animate-pulse">Loading...</span>
                    </span>
                  ) : (
                    `${archivedNotes.length} archived items`
                  )}
                </p>
              </div>
            </motion.div>

            {selectedItems.length > 0 && (
              <motion.div variants={cardVariants}>
                <button
                  onClick={handleRestoreSelected}
                  className={`
                    flex items-center gap-2 px-4 py-2 
                    ${theme === 'midnight' ? 'bg-blue-600/80 hover:bg-blue-500/80' : 'bg-blue-600 hover:bg-blue-700'}
                    text-white rounded-lg transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                  `}
                >
                  <Archive className="w-4 h-4" />
                  <span className="font-medium text-sm">Restore Selected ({selectedItems.length})</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search archived items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <motion.div variants={cardVariants}>
            <button
              onClick={() => setShowFilters(!showFilters)}
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
                <div className="p-2 bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400 midnight:text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={() => setFilters({
                  sortBy: 'archivedAt',
                  sortOrder: 'desc',
                  tags: [],
                  hasLinks: false
                })}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>
            <ArchiveFilters
              filters={filters}
              onFilterChange={(key, value) =>
                setFilters(prev => ({ ...prev, [key]: value }))
              }
            />
          </motion.div>
        )}

        {/* Archive List */}
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
          <ArchiveList
            filters={filters}
            searchQuery={searchQuery}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onRestoreSelected={handleRestoreSelected}
          />
        </motion.div>
      </div>
    </div>
  );
});