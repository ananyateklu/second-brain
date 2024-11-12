import React, { useState, useEffect } from 'react';
import { Trash2, Search, SlidersHorizontal, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTrash } from '../../../contexts/TrashContext';
import { TrashList } from './TrashList';
import { TrashFilters } from './TrashFilters';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Input } from '../../shared/Input';

export function TrashPage() {
  const { trashedItems, emptyTrash, refreshTrashItems } = useTrash();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    tags: [] as string[]
  });

  useEffect(() => {
    refreshTrashItems();
  }, [refreshTrashItems]);

  // Calculate counts for different item types
  const counts = {
    notes: trashedItems.filter(item => item.type === 'note').length,
    tasks: trashedItems.filter(item => item.type === 'task').length,
    reminders: trashedItems.filter(item => item.type === 'reminder').length,
    ideas: trashedItems.filter(item => item.type === 'idea').length
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setShowEmptyTrashDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trash
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Items will be permanently deleted after 30 days
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowEmptyTrashDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Trash</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            label=""
            icon={Search}
            type="text"
            placeholder="Search deleted items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${
            showFilters
              ? 'bg-primary-100/20 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-gray-900 dark:text-gray-100'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl p-6">
          <TrashFilters
            filters={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            availableTypes={['note', 'task', 'reminder', 'idea']}
          />
        </div>
      )}

      {/* Trash List */}
      <TrashList
        filters={filters}
        searchQuery={searchQuery}
      />

      {/* Empty Trash Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showEmptyTrashDialog}
        onClose={() => setShowEmptyTrashDialog(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        description="Are you sure you want to permanently delete all items in the Trash? This action cannot be undone."
        confirmLabel="Empty Trash"
        confirmIcon={Trash2}
        isDangerous
      />
    </div>
  );
}