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
      <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 p-6 rounded-xl">
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
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {counts.notes} notes • {counts.tasks} tasks • {counts.reminders} reminders • {counts.ideas} ideas
              </div>
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
        <div className="flex-1">
          <Input
            label=""
            icon={Search}
            type="text"
            placeholder="Search deleted items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-glass hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all text-gray-900 dark:text-gray-100"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 p-4 rounded-xl shadow-lg">
          <TrashFilters
            filters={filters}
            onFilterChange={(key, value) => 
              setFilters(prev => ({ ...prev, [key]: value }))
            }
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