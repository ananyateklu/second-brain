import { useState, useEffect } from 'react';
import { Trash2, Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTrash } from '../../../contexts/trashContextUtils';
import { useActivities } from '../../../contexts/activityContextUtils';
import { TrashList } from './TrashList';
import { TrashFilters } from './TrashFilters';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Input } from '../../shared/Input';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';

export function TrashPage() {
  const { trashedItems, restoreItems, deleteItemsPermanently, emptyTrash, refreshTrashItems } = useTrash();
  const { fetchActivities } = useActivities();
  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    types: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    tags: [] as string[]
  });

  useEffect(() => {
    refreshTrashItems();
  }, [refreshTrashItems]);

  const handleRestore = async (itemIds: string[]) => {
    try {
      await restoreItems(itemIds);
      await fetchActivities();
      setSelectedItems([]);
      setShowRestoreDialog(false);
    } catch (error) {
      console.error('Failed to restore items:', error);
    }
  };

  const handleDelete = async (itemIds: string[]) => {
    try {
      await deleteItemsPermanently(itemIds);
      await fetchActivities();
      setSelectedItems([]);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete items:', error);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
      await fetchActivities();
      setShowEmptyTrashDialog(false);
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="px-6 space-y-8 relative">
        {/* Trash Header */}
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
              <div className="p-2.5 bg-red-100/20 dark:bg-red-900/20 midnight:bg-red-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400 midnight:text-red-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Trash</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {trashedItems.length} items in trash
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <button
                onClick={() => setShowEmptyTrashDialog(true)}
                className={`
                  flex items-center gap-2 px-4 py-2 
                  ${theme === 'midnight' ? 'bg-red-600/80 hover:bg-red-500/80' : 'bg-red-600 hover:bg-red-700'}
                  text-white rounded-lg transition-all duration-200 
                  hover:scale-105 hover:-translate-y-0.5 
                  shadow-sm hover:shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:hover:scale-100 disabled:hover:translate-y-0
                `}
                disabled={trashedItems.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-medium text-sm">Empty Trash</span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and Controls */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <motion.div variants={cardVariants} className="flex gap-2">
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
              {(filters.types.length > 0 || filters.dateRange !== 'all' || filters.tags.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              )}
            </button>

            <button
              onClick={refreshTrashItems}
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
              <RotateCcw className="w-4 h-4" />
              <span className="font-medium text-sm">Refresh</span>
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
                <div className="p-2 bg-red-100/20 dark:bg-red-900/20 midnight:bg-red-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-red-600 dark:text-red-400 midnight:text-red-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={() => setFilters({
                  types: [],
                  dateRange: 'all',
                  tags: []
                })}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>
            <TrashFilters
              filters={filters}
              onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              availableTypes={['note', 'task', 'reminder', 'idea']}
            />
          </motion.div>
        )}

        {/* Trash List */}
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
          <TrashList
            trashedItems={trashedItems}
            searchQuery={searchQuery}
            filters={filters}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            onRestore={(ids: string[]) => {
              setSelectedItems(ids);
              setShowRestoreDialog(true);
            }}
            onDelete={(ids: string[]) => {
              setSelectedItems(ids);
              setShowDeleteDialog(true);
            }}
          />
        </motion.div>

        {/* Dialogs */}
        <ConfirmationDialog
          isOpen={showEmptyTrashDialog}
          onClose={() => setShowEmptyTrashDialog(false)}
          onConfirm={handleEmptyTrash}
          title="Empty Trash"
          description="Are you sure you want to empty the trash? This action cannot be undone."
          confirmLabel="Empty Trash"
          confirmIcon={Trash2}
          isDangerous
        />

        <ConfirmationDialog
          isOpen={showRestoreDialog}
          onClose={() => setShowRestoreDialog(false)}
          onConfirm={() => handleRestore(selectedItems)}
          title="Restore Items"
          description="Are you sure you want to restore the selected items?"
          confirmLabel="Restore"
          confirmIcon={RotateCcw}
        />

        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => handleDelete(selectedItems)}
          title="Delete Permanently"
          description="Are you sure you want to permanently delete the selected items? This action cannot be undone."
          confirmLabel="Delete Permanently"
          confirmIcon={Trash2}
          isDangerous
        />
      </div>
    </div>
  );
}