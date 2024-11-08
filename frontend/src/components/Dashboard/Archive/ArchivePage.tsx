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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Archive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {archivedNotes.length} archived items
              </p>
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
            placeholder="Search archived items..."
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
  );
}