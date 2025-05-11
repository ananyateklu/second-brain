import React from 'react';
import { NoteCard } from '../NoteCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { RotateCcw } from 'lucide-react';
import { Note } from '../../../types/note';
import { Idea } from '../../../types/idea';

interface ArchiveListProps {
  archivedItems: Array<Note | Idea>;
  filters: {
    sortBy: 'archivedAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
    tags: string[];
    hasLinks: boolean;
  };
  searchQuery: string;
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onRestoreSingleItem: (id: string) => Promise<void>;
}

export function ArchiveList({
  archivedItems,
  filters,
  searchQuery,
  selectedItems,
  onSelectItem,
  onRestoreSingleItem
}: ArchiveListProps) {
  const filteredItems = React.useMemo(() => {
    let filtered = [...archivedItems];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      );
    }

    // Apply tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    // Apply links filter
    if (filters.hasLinks) {
      filtered = filtered.filter(item =>
        (item as Note).linkedNoteIds ?
          (item as Note).linkedNoteIds?.length > 0 :
          (item as Idea).linkedItems?.length > 0
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
  }, [archivedItems, searchQuery, filters]);

  if (filteredItems.length === 0) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
        {filteredItems.map(item => {
          const isIdea = 'linkedItems' in item;
          return (
            <div
              key={item.id}
              className="cursor-pointer w-full relative group"
            >
              <div onClick={() => onSelectItem(item.id)}>
                {isIdea ? (
                  <IdeaCard
                    idea={item as Idea}
                    viewMode="grid"
                    isSelected={selectedItems.includes(item.id)}
                    isArchiveView
                  />
                ) : (
                  <NoteCard
                    note={item as Note}
                    viewMode="grid"
                    isSelected={selectedItems.includes(item.id)}
                    isArchiveView
                  />
                )}
              </div>

              {/* Restore button overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreSingleItem(item.id);
                  }}
                  className="p-2 bg-[#64ab6f] hover:bg-[#64ab6f]/90 text-white rounded-full shadow-md"
                  title="Restore item"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}