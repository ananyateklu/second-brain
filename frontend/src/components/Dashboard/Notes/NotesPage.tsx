import { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, FileText, Grid, List, Network } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { NoteCard } from '../NoteCard';
import { Note } from '../../../types/note';
import { NewNoteModal } from './NewNoteModal';
import { FilterDropdown } from './FilterDropdown';
import { NotesGraph } from './NotesGraph';
import { LoadingScreen } from '../../shared/LoadingScreen';
import { Input } from '../../shared/Input';
import { useModal } from '../../../contexts/ModalContext';
import { sortNotes } from '../../../utils/noteUtils';
import { Filters } from '../../../types/filters';

const defaultFilters: Filters = {
  search: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  showPinned: false,
  showFavorites: false,
  tags: []
};

export function NotesPage() {
  const { notes, isLoading } = useNotes();
  const { setSelectedNote } = useModal();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');

  const regularNotes = useMemo(() => {
    return notes.filter(note => !note.isIdea);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const filtered = regularNotes
      .filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          note.content.toLowerCase().includes(filters.search.toLowerCase());
        const matchesPinned = !filters.showPinned || note.isPinned;
        const matchesFavorites = !filters.showFavorites || note.isFavorite;
        const matchesTags = filters.tags.length === 0 ||
          filters.tags.some(tag => note.tags.includes(tag));

        return matchesSearch && matchesPinned && matchesFavorites && matchesTags;
      });

    if (filters.sortBy === 'title') {
      return filtered.sort((a, b) => {
        return filters.sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      });
    }

    return sortNotes(filtered);
  }, [regularNotes, filters]);

  const allTags = useMemo(() => {
    return Array.from(new Set(regularNotes.flatMap(note => note.tags)));
  }, [regularNotes]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleFilterChange = (key: keyof Filters, value: string | boolean | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditNote = (note: Note) => {
    const fullNote: Note = {
      ...note,
      isIdea: note.isIdea || false,
      linkedNoteIds: note.linkedNoteIds || []
    };
    setSelectedNote(fullNote);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const graphNotes = filteredNotes.map(note => {
    const linkedNotes = note.linkedNoteIds
      .map(id => notes.find(n => n.id === id))
      .filter((n): n is Note => n !== undefined && !n.isArchived && !n.isDeleted);
    
    return {
      ...note,
      linkedNoteIds: linkedNotes.map(n => n.id)
    };
  });

  const toggleFilters = () => setShowFilters(prev => !prev);

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
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {regularNotes.length} notes
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewNoteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search notes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="bg-[#1C1C1E] dark:bg-[#1C1C1E] border-[#2C2C2E] dark:border-[#2C2C2E]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] bg-[#1C1C1E] dark:bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] transition-all text-gray-100 dark:text-gray-100"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] transition-all ${viewMode === 'grid'
                  ? 'bg-[#64ab6f]/20 dark:bg-[#64ab6f]/20 text-[#64ab6f] dark:text-[#64ab6f]'
                  : 'bg-[#1C1C1E] dark:bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] text-gray-100 dark:text-gray-100'
                }`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] transition-all ${viewMode === 'list'
                  ? 'bg-[#64ab6f]/20 dark:bg-[#64ab6f]/20 text-[#64ab6f] dark:text-[#64ab6f]'
                  : 'bg-[#1C1C1E] dark:bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] text-gray-100 dark:text-gray-100'
                }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('graph')}
              className={`p-2 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] transition-all ${viewMode === 'graph'
                  ? 'bg-[#64ab6f]/20 dark:bg-[#64ab6f]/20 text-[#64ab6f] dark:text-[#64ab6f]'
                  : 'bg-[#1C1C1E] dark:bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] text-gray-100 dark:text-gray-100'
                }`}
              title="Graph View"
            >
              <Network className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] bg-[#1C1C1E] dark:bg-[#1C1C1E] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-100 dark:text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-[#64ab6f] dark:text-gray-400 dark:hover:text-[#64ab6f]"
              >
                Clear all
              </button>
            </div>

            <FilterDropdown
              filters={filters}
              allTags={allTags}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-0.5">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="cursor-pointer w-full"
              >
                <NoteCard note={note} viewMode="grid" />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4 px-0.5">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="cursor-pointer w-full"
              >
                <NoteCard note={note} viewMode="list" />
              </div>
            ))}
          </div>
        ) : (
          <NotesGraph
            notes={graphNotes}
            onNoteClick={(noteId) => {
              const note = notes.find(n => n.id === noteId);
              if (note) {
                handleEditNote(note);
              }
            }}
          />
        )}
      </div>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
      />
    </div>
  );
}