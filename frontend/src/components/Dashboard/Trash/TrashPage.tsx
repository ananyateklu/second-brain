import { useState, useEffect } from 'react';
import { Trash2, Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useTrash } from '../../../contexts/trashContextUtils';
import { useActivities } from '../../../contexts/activityContextUtils';
import { TrashList } from './TrashList';
import { TrashFilters } from './TrashFilters';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Input } from '../../shared/Input';

export function TrashPage() {
  const { trashedItems, restoreItems, deleteItemsPermanently, emptyTrash, refreshTrashItems } = useTrash();
  const { fetchActivities } = useActivities();
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
      // Handle error appropriately
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
      // Handle error appropriately
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
      await fetchActivities();
      setShowEmptyTrashDialog(false);
    } catch (error) {
      console.error('Failed to empty trash:', error);
      // Handle error appropriately
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed bg-gradient-to-br from-[var(--color-background)] to-[var(--color-surface)] -z-10" />

      <div className="px-6 space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trash</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trashedItems.length} items in trash
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmptyTrashDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                  disabled={trashedItems.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Empty Trash</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="search"
              label=""
              icon={Search}
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(filters.types.length > 0 || filters.dateRange !== 'all' || filters.tags.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
          <button
            onClick={refreshTrashItems}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <TrashFilters
            filters={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            availableTypes={['note', 'task', 'reminder', 'idea']}
          />
        )}

        {/* Trash List */}
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

        {/* Empty Trash Confirmation Dialog */}
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

        {/* Restore Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showRestoreDialog}
          onClose={() => setShowRestoreDialog(false)}
          onConfirm={() => handleRestore(selectedItems)}
          title="Restore Items"
          description="Are you sure you want to restore the selected items?"
          confirmLabel="Restore"
          confirmIcon={RotateCcw}
        />

        {/* Delete Confirmation Dialog */}
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