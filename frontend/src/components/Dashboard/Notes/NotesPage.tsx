import { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, FileText, Grid, List, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotes } from '../../../contexts/notesContextUtils';
import { NoteCard } from '../NoteCard';
import { Note } from '../../../types/note';
import { NewNoteModal } from './NewNoteModal';
import { FilterDropdown } from './FilterDropdown';
import { NotesMindMap as NotesGraph } from './NotesMindMap';
import { LoadingScreen } from '../../shared/LoadingScreen';
import { Input } from '../../shared/Input';
import { useModal } from '../../../contexts/modalContextUtils';
import { sortNotes } from '../../../utils/noteUtils';
import { Filters } from '../../../types/filters';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';

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
  const { theme } = useTheme();
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
    return <LoadingScreen variant="notes" message="Loading your notes..." />;
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

  const renderNotesList = (notes: Note[]) => {
    if (notes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <FileText className="w-16 h-16 text-blue-400/50 dark:text-blue-500/30 mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
            No notes found
          </h3>
          <p className="text-[var(--color-textSecondary)] max-w-md">
            {filters.search || filters.tags.length > 0 || filters.showPinned || filters.showFavorites
              ? "Try adjusting your filters to find what you're looking for."
              : "Start capturing your thoughts! Click the 'New Note' button to create your first note."}
          </p>
        </div>
      );
    }

    switch (viewMode) {
      case 'grid':
        return (
          <div className={cardGridStyles}>
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode="grid"
                onClick={() => handleEditNote(note)}
              />
            ))}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-4 px-0.5">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode="list"
                onClick={() => handleEditNote(note)}
              />
            ))}
          </div>
        );

      default:
        return (
          <NotesGraph
            notes={graphNotes}
            onNoteSelect={(noteId: string) => {
              const note = notes.find(n => n.id === noteId);
              if (note) {
                handleEditNote(note);
              }
            }}
          />
        );
    }
  };

  const getViewModeButtonClass = (mode: 'grid' | 'list' | 'graph', currentMode: string) => {
    const baseClasses = `
      p-2 rounded-lg 
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
    `;

    if (currentMode === mode) {
      return `${baseClasses} bg-blue-500/20 text-blue-600 dark:text-blue-400 midnight:text-blue-300`;
    }

    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative">
        {/* Notes Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          <div className="flex flex-col sm:flex-row gap-6 justify-between">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 midnight:text-blue-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Notes</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {regularNotes.length} notes in your collection
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <button
                onClick={() => setShowNewNoteModal(true)}
                className={`
                  flex items-center gap-2 px-4 py-2 
                  ${theme === 'midnight' ? 'bg-blue-600/80 hover:bg-blue-500/80' : 'bg-blue-600 hover:bg-blue-700'}
                  text-white rounded-lg transition-all duration-200 
                  hover:scale-105 hover:-translate-y-0.5 
                  shadow-sm hover:shadow-md
                `}
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">New Note</span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and View Controls */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search notes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full"
            />
          </div>

          <motion.div
            variants={cardVariants}
            className="flex gap-2"
          >
            <button
              onClick={toggleFilters}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg 
                border-[0.5px] border-white/10
                ${getContainerBackground()}
                backdrop-blur-xl 
                ring-1 ring-white/5
                hover:bg-[var(--color-surfaceHover)]
                text-[var(--color-text)]
                transition-all duration-200
                hover:-translate-y-0.5
                shadow-sm hover:shadow-md
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-medium text-sm">Filters</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={getViewModeButtonClass('grid', viewMode)}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={getViewModeButtonClass('list', viewMode)}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('graph')}
              className={getViewModeButtonClass('graph', viewMode)}
              title="Graph View"
            >
              <Network className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              p-6
              rounded-2xl
              border-[0.5px] 
              border-white/10
              ${getContainerBackground()}
              backdrop-blur-xl 
              ring-1 ring-white/5
              shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
              dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
              transition-all 
              duration-300
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100/20 dark:bg-blue-900/20 midnight:bg-blue-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400 midnight:text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>

            <FilterDropdown
              filters={filters}
              allTags={allTags}
              onFilterChange={handleFilterChange}
            />
          </motion.div>
        )}

        {/* Notes Content */}
        <motion.div
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
            min-h-[500px]
          `}
        >
          {renderNotesList(filteredNotes)}
        </motion.div>

        <NewNoteModal
          isOpen={showNewNoteModal}
          onClose={() => setShowNewNoteModal(false)}
        />
      </div>
    </div>
  );
}