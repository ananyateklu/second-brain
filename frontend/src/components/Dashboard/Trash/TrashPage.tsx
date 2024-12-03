import { useState, useEffect } from 'react';
import { Trash2, Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useTrash } from '../../../contexts/trashContextUtils';
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
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient - matches Dashboard.tsx */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
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
                    Items will be permanently deleted after 30 days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmptyTrashDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Empty Trash</span>
                </button>
              </div>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all duration-200 hover:scale-105 ${
                showFilters
                  ? 'bg-white/20 dark:bg-gray-800/20 text-primary-600 dark:text-primary-400 border-primary-500/50'
                  : 'bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-gray-900 dark:text-gray-100'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-lg bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30">
              <TrashFilters
                filters={filters}
                onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                availableTypes={['note', 'task', 'reminder', 'idea']}
              />
            </div>
          )}


        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(counts).map(([type, count]) => (
            <div key={type} className="bg-white/20 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary-50/50 dark:bg-primary-900/30">
                    <RotateCcw className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {type}
                  </span>
                </div>
                <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>

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
    </div>
  );
}