import React, { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, FileText, Grid, List, Network } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { Note, NoteCard } from '../NoteCard';
import { NewNoteModal } from './NewNoteModal';
import { EditNoteModal } from './EditNoteModal';
import { FilterDropdown } from './FilterDropdown';
import { NotesGraph } from './NotesGraph';
import { LoadingScreen } from '../../shared/LoadingScreen';
import { Input } from '../../shared/Input';


interface Filters {
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  showPinned: boolean;
  showFavorites: boolean;
  tags: string[];
}

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
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Filter out ideas from the notes list
  const regularNotes = useMemo(() => {
    return notes.filter(note => !note.tags.includes('idea'));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return regularNotes
      .filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          note.content.toLowerCase().includes(filters.search.toLowerCase());
        const matchesPinned = !filters.showPinned || note.isPinned;
        const matchesFavorites = !filters.showFavorites || note.isFavorite;
        const matchesTags = filters.tags.length === 0 ||
          filters.tags.some(tag => note.tags.includes(tag));

        return matchesSearch && matchesPinned && matchesFavorites && matchesTags;
      })
      .sort((a, b) => {
        const aValue = a[filters.sortBy];
        const bValue = b[filters.sortBy];

        if (filters.sortBy === 'title') {
          return filters.sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return filters.sortOrder === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      });
  }, [regularNotes, filters]);

  const allTags = useMemo(() => {
    return Array.from(new Set(regularNotes.flatMap(note => note.tags)));
  }, [regularNotes]);

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
  };

  const handleCloseEditModal = () => {
    setSelectedNote(null);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {regularNotes.length} notes
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-glass hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all text-gray-900 dark:text-gray-100"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={() => setShowNewNoteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            label=""
            icon={Search}
            type="text"
            placeholder="Search notes..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all ${
              viewMode === 'grid'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }`}
            title="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all ${
              viewMode === 'list'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setViewMode('graph')}
            className={`p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-glass transition-all ${
              viewMode === 'graph'
                ? 'bg-primary-50/90 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100'
            }`}
            title="Graph View"
          >
            <Network className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-glass shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => handleEditNote(note)}
              className="cursor-pointer"
            >
              <NoteCard note={note} viewMode="grid" />
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => handleEditNote(note)}
              className="cursor-pointer"
            >
              <NoteCard note={note} viewMode="list" />
            </div>
          ))}
        </div>
      ) : (
        <NotesGraph 
          notes={filteredNotes.map(note => ({
            ...note,
            linkedNotes: note.linkedNotes?.map(n => n.id) || []
          }))}
          onNoteClick={(noteId) => {
            const note = notes.find(n => n.id === noteId);
            if (note) {
              handleEditNote({
                ...note,
                linkedNotes: note.linkedNotes?.map(n => n.id) || []
              });
            }
          }}
        />
      )}

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
      />

      {selectedNote && (
        <EditNoteModal
          isOpen={selectedNote !== null}
          onClose={handleCloseEditModal}
          note={selectedNote}
        />
      )}
    </div>
  );
}