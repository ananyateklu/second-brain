import React, { useState, useEffect } from 'react';
import { Archive, Search, SlidersHorizontal } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { ArchiveList } from './ArchiveList';
import { ArchiveFilters } from './ArchiveFilters';
import { Input } from '../../shared/Input';

export function ArchivePage() {
  const { archivedNotes, unarchiveNote, restoreMultipleNotes, loadArchivedNotes } = useNotes();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    sortBy: 'archivedAt' as 'archivedAt' | 'updatedAt' | 'title',
    sortOrder: 'desc' as 'asc' | 'desc',
    tags: [] as string[],
    hasLinks: false
  });

  // Load archived notes when the page mounts
  useEffect(() => {
    loadArchivedNotes();
  }, [loadArchivedNotes]);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleRestoreSelected = async () => {
    if (selectedItems.length === 0) return;

    const message = selectedItems.length === 1
      ? 'Are you sure you want to restore this note?'
      : `Are you sure you want to restore ${selectedItems.length} notes?`;

    if (window.confirm(message)) {
      try {
        await restoreMultipleNotes(selectedItems);
        setSelectedItems([]);
        await loadArchivedNotes();
      } catch (error) {
        console.error('Failed to restore selected notes:', error);
        // You might want to add error handling UI here
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient - matches Dashboard.tsx */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                  <Archive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {archivedNotes.length} archived items
                  </p>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRestoreSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Restore Selected ({selectedItems.length})</span>
                  </button>
                </div>
              )}
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
              placeholder="Search archived items..."
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
          <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filters
              </h3>
              <button
                onClick={() => setFilters({
                  sortBy: 'archivedAt',
                  sortOrder: 'desc',
                  tags: [],
                  hasLinks: false
                })}
                className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
          </div>
        )}

        {/* Archive List */}
        <ArchiveList
          filters={filters}
          searchQuery={searchQuery}
          selectedItems={selectedItems}
          onSelectItem={handleSelectItem}
          onRestoreSelected={handleRestoreSelected}
        />
      </div>
    </div>
  );
}