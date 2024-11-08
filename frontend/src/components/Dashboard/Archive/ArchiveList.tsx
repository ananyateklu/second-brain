import React from 'react';
import { useNotes } from '../../../contexts/NotesContext';
import { ArchiveNoteCard } from './ArchiveNoteCard';
import { RotateCcw } from 'lucide-react';

interface ArchiveListProps {
  filters: {
    sortBy: 'archivedAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
    tags: string[];
    hasLinks: boolean;
  };
  searchQuery: string;
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onRestoreSelected: () => void;
}

export function ArchiveList({
  filters,
  searchQuery,
  selectedItems,
  onSelectItem,
  onRestoreSelected
}: ArchiveListProps) {
  const { archivedNotes } = useNotes();

  const filteredNotes = React.useMemo(() => {
    let filtered = [...archivedNotes];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    }

    // Apply tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note =>
        filters.tags.some(tag => note.tags.includes(tag))
      );
    }

    // Apply links filter
    if (filters.hasLinks) {
      filtered = filtered.filter(note =>
        note.linkedNotes && note.linkedNotes.length > 0
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let valueA, valueB;

      switch (filters.sortBy) {
        case 'archivedAt':
          valueA = new Date(a.archivedAt || 0).getTime();
          valueB = new Date(b.archivedAt || 0).getTime();
          break;
        case 'updatedAt':
          valueA = new Date(a.updatedAt).getTime();
          valueB = new Date(b.updatedAt).getTime();
          break;
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        default:
          return 0;
      }

      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      if (valueA < valueB) return -1 * sortOrder;
      if (valueA > valueB) return 1 * sortOrder;
      return 0;
    });
  }, [archivedNotes, searchQuery, filters]);

  if (filteredNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery || filters.tags.length > 0 || filters.hasLinks
            ? "No archived items match your search criteria"
            : "No archived items"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 rounded-lg border border-gray-200/30 dark:border-gray-700/30">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItems.length} items selected
          </span>
          <button
            onClick={onRestoreSelected}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Selected</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <ArchiveNoteCard
            key={note.id}
            note={note}
            isSelected={selectedItems.includes(note.id)}
            onSelect={() => onSelectItem(note.id)}
          />
        ))}
      </div>
    </div>
  );
}