import React from 'react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { NoteCard } from '../NoteCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { RotateCcw } from 'lucide-react';
import { RestoreWarningModal } from '../../shared/RestoreWarningModal';
import { Idea } from '../../../types/idea';

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
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);

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
        note.linkedNoteIds && note.linkedNoteIds.length > 0
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

  const handleRestoreClick = () => {
    setShowRestoreModal(true);
  };

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
        <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-[#1C1C1E] dark:bg-[#1C1C1E] rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E]">
          <span className="text-sm text-gray-400 dark:text-gray-400">
            {selectedItems.length} items selected
          </span>
          <button
            onClick={handleRestoreClick}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#64ab6f] hover:bg-[#64ab6f]/90 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Selected</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
        {filteredNotes.map(note => {
          const isIdea = 'linkedItems' in note;
          return (
            <div
              key={note.id}
              onClick={() => onSelectItem(note.id)}
              className="cursor-pointer w-full"
            >
              {isIdea ? (
                <IdeaCard
                  idea={note as unknown as Idea}
                  viewMode="grid"
                  isSelected={selectedItems.includes(note.id)}
                  isArchiveView
                />
              ) : (
                <NoteCard
                  note={note}
                  viewMode="grid"
                  isSelected={selectedItems.includes(note.id)}
                  isArchiveView
                />
              )}
            </div>
          );
        })}
      </div>

      <RestoreWarningModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={() => {
          setShowRestoreModal(false);
          onRestoreSelected();
        }}
        count={selectedItems.length}
      />
    </div>
  );
}