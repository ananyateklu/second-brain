import React, { useState } from 'react';
import { Trash2, Search, SlidersHorizontal, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTrash } from '../../../contexts/TrashContext';
import { TrashList } from './TrashList';
import { TrashFilters } from './TrashFilters';
import { ConfirmationDialog } from './ConfirmationDialog';

export function TrashPage() {
  const { trashedItems, emptyTrash } = useTrash();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    tags: [] as string[]
  });

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setShowEmptyTrashDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trash</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {trashedItems.length} items • Items are automatically deleted after 30 days
              </p>
            </div>
          </div>

          <div className="flex gap-3">
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
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search deleted items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-morphism p-4 rounded-xl">
          <TrashFilters
            filters={filters}
            onFilterChange={(key, value) => 
              setFilters(prev => ({ ...prev, [key]: value }))
            }
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