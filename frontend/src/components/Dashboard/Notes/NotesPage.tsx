import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, FileText, Grid, List, Network, Copy, Server, Cloud, AlertCircle, Settings, Loader2, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotes } from '../../../contexts/notesContextUtils';
import { NoteCard } from '../NoteCard';
import { Note } from '../../../types/note';
import { TickTickTask } from '../../../types/integrations';
import { integrationsService } from '../../../services/api/integrations.service';
import { NewNoteModal } from './NewNoteModal';
import { FilterDropdown } from './FilterDropdown';
import { NotesMindMap as NotesGraph } from './NotesMindMap';
import { LoadingScreen } from '../../shared/LoadingScreen';
import { Input } from '../../shared/Input';
import { useModal } from '../../../contexts/modalContextUtils';
import { Filters } from '../../../types/filters';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { DuplicateItemsModal } from '../../shared/DuplicateItemsModal';
import { Modal } from '../../shared/Modal';
import { TickTickNoteModal } from './TickTickNoteModal';

// Define project type locally
interface TickTickProject {
  id: string;
  name: string;
  color?: string;
  kind?: string;
}

// Modal for TickTick project settings
function TickTickSettingsModal({
  isOpen,
  onClose,
  projectId,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSave: (projectId: string) => void;
}) {
  const [newProjectId, setNewProjectId] = useState(projectId);
  const [tickTickProjects, setTickTickProjects] = useState<TickTickProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Fetch TickTick projects when modal opens
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectError(null);
        // Only get projects with kind "NOTE"
        const projects = await integrationsService.getTickTickProjects("NOTE");
        setTickTickProjects(projects);
      } catch (error) {
        console.error('Failed to fetch TickTick projects:', error);
        setProjectError('Failed to load projects. Please try again.');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TickTick Notes Settings">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select TickTick Notes Project
          </label>
          {isLoadingProjects ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
            </div>
          ) : projectError ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {projectError}
            </div>
          ) : tickTickProjects.length === 0 ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-yellow-600 dark:text-yellow-400 text-sm">
              No note projects found in your TickTick account.
            </div>
          ) : (
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">-- Select a project --</option>
              {tickTickProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose which TickTick notes project to use with Second Brain.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(newProjectId)}
            disabled={isLoadingProjects}
            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none ${isLoadingProjects ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

type NoteWithSource = Note & { source: 'local' | 'ticktick'; projectId?: string };

function mapTickTickToLocalNote(tickTickNote: TickTickTask): NoteWithSource {
  return {
    id: `ticktick-${tickTickNote.id}`,
    projectId: tickTickNote.projectId,
    title: tickTickNote.title,
    content: tickTickNote.content || '',
    tags: tickTickNote.tags || [],
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    createdAt: tickTickNote.createdTime || new Date().toISOString(),
    updatedAt: tickTickNote.modifiedTime || new Date().toISOString(),
    linkedNoteIds: [],
    links: [],
    linkedReminders: [],
    source: 'ticktick',
  };
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
  const {
    notes,
    isLoading,
    duplicateNotes,
    tickTickNotes,
    tickTickError,
    isTickTickConnected,
    fetchTickTickNotes,
    tickTickProjectId,
    updateTickTickProjectId
  } = useNotes();

  const { setSelectedNote } = useModal();
  const { theme } = useTheme();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');
  const [showTickTickSettings, setShowTickTickSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [noteSourceFilter, setNoteSourceFilter] = useState<'all' | 'local' | 'ticktick'>(() => {
    const stored = localStorage.getItem('note_source_filter');
    return (stored as 'all' | 'local' | 'ticktick') || 'all';
  });
  const [currentTickTickProject, setCurrentTickTickProject] = useState<{ id: string; name: string } | null>(null);
  const [tickTickProjectsList, setTickTickProjectsList] = useState<TickTickProject[]>([]);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [showTickTickNoteModal, setShowTickTickNoteModal] = useState(false);
  const [selectedTickTickNote, setSelectedTickTickNote] = useState<{ projectId: string; noteId: string } | null>(null);

  // Persist note source filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('note_source_filter', noteSourceFilter);
  }, [noteSourceFilter]);

  const regularNotes = useMemo(() => {
    return notes; // No need to filter by isIdea since ideas are now in a separate collection
  }, [notes]);

  const mappedTickTickNotes: NoteWithSource[] = useMemo(() =>
    tickTickNotes.map(mapTickTickToLocalNote),
    [tickTickNotes]
  );

  const localNotesWithSource: NoteWithSource[] = useMemo(() =>
    regularNotes.map(note => ({ ...note, source: 'local' })),
    [regularNotes]
  );

  const filteredNotes = useMemo(() => {
    let combinedNotes: NoteWithSource[] = [];

    if (noteSourceFilter === 'all') {
      combinedNotes = [...localNotesWithSource, ...mappedTickTickNotes];
    } else if (noteSourceFilter === 'local') {
      combinedNotes = localNotesWithSource;
    } else if (noteSourceFilter === 'ticktick') {
      combinedNotes = mappedTickTickNotes;
    }

    return combinedNotes.filter(note => {
      if (!note || typeof note.title !== 'string' || typeof note.content !== 'string') {
        return false;
      }
      const matchesSearch = note.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        note.content.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPinned = !filters.showPinned || note.isPinned;
      const matchesFavorites = !filters.showFavorites || note.isFavorite;
      const matchesTags = filters.tags.length === 0 ||
        filters.tags.some(tag => note.tags.includes(tag));

      return matchesSearch && matchesPinned && matchesFavorites && matchesTags;
    });
  }, [localNotesWithSource, mappedTickTickNotes, noteSourceFilter, filters]);

  const allTags = useMemo(() => {
    const allNotes = noteSourceFilter === 'all'
      ? [...localNotesWithSource, ...mappedTickTickNotes]
      : noteSourceFilter === 'local'
        ? localNotesWithSource
        : mappedTickTickNotes;

    return Array.from(new Set(allNotes.flatMap(note => note.tags)));
  }, [localNotesWithSource, mappedTickTickNotes, noteSourceFilter]);

  // Fetch TickTick project list and update current project name
  useEffect(() => {
    const fetchProjectsAndSetCurrent = async () => {
      if (!isTickTickConnected) {
        setCurrentTickTickProject(null);
        setHasFetchedProjects(false); // Reset fetch status if disconnected
        return;
      }

      let projectsToUse: TickTickProject[] = tickTickProjectsList;

      // Fetch the list only if not already fetched OR we just connected
      if (!hasFetchedProjects) {
        try {
          projectsToUse = await integrationsService.getTickTickProjects("NOTE");
          setTickTickProjectsList(projectsToUse);
          setHasFetchedProjects(true);
        } catch (error) {
          console.error('Error fetching TickTick project list:', error);
          setCurrentTickTickProject({ id: tickTickProjectId, name: 'Error Loading Project' });
          setHasFetchedProjects(false); // Allow refetch on next attempt
          return; // Exit if fetch failed
        }
      } else {
        // Use the already fetched list
        projectsToUse = tickTickProjectsList;
      }

      // Find the current project name from the list
      if (tickTickProjectId && projectsToUse.length > 0) {
        const project = projectsToUse.find(p => p.id === tickTickProjectId);
        if (project) {
          setCurrentTickTickProject({ id: project.id, name: project.name });
        } else {
          setCurrentTickTickProject({ id: tickTickProjectId, name: 'Unknown Project' });
        }
      } else if (!tickTickProjectId) {
        setCurrentTickTickProject(null); // No project selected
      } else {
        // Project list might be empty from API, or ID is invalid
        setCurrentTickTickProject({ id: tickTickProjectId, name: 'Unknown Project' });
      }
    };

    fetchProjectsAndSetCurrent();
  }, [isTickTickConnected, tickTickProjectId, hasFetchedProjects, tickTickProjectsList]);

  const handleSaveTickTickProjectId = async (newProjectId: string) => {
    try {
      await updateTickTickProjectId(newProjectId);
      // Manually refetch notes after project ID update
      if (isTickTickConnected && newProjectId) {
        await fetchTickTickNotes();
      }
      setShowTickTickSettings(false);
    } catch (error) {
      console.error('Failed to update TickTick project ID:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen variant="notes" message="Loading your notes..." />;
  }

  const handleFilterChange = (key: keyof Filters, value: string | boolean | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditNote = (note: NoteWithSource) => {
    if (note.source === 'ticktick') {
      // Extract the actual ID (remove "ticktick-" prefix)
      const tickTickId = note.id.replace('ticktick-', '');

      // Set the selected note and open the modal
      setSelectedTickTickNote({
        projectId: note.projectId || tickTickProjectId,
        noteId: tickTickId
      });
      setShowTickTickNoteModal(true);
    } else {
      // Convert the note to a full Note object that setSelectedNote expects
      const fullNote: Note = {
        ...note,
        linkedNoteIds: note.linkedNoteIds || []
      };
      setSelectedNote(fullNote);
    }
  };

  // Add a function to close the TickTick note modal
  const handleCloseTickTickNoteModal = () => {
    setShowTickTickNoteModal(false);
    setSelectedTickTickNote(null);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const graphNotes = filteredNotes
    .filter(note => note.source === 'local') // Only include local notes in graph view
    .map(note => {
      const linkedNotes = (note as Note).linkedNoteIds
        ?.map(id => notes.find(n => n.id === id))
        .filter((n): n is Note => n !== undefined && !n.isArchived && !n.isDeleted);

      return {
        ...note,
        linkedNoteIds: linkedNotes?.map(n => n.id) || []
      };
    });

  const toggleFilters = () => setShowFilters(prev => !prev);

  const handleDuplicateNotes = async (selectedIds: string[]) => {
    try {
      // Filter out TickTick notes - only duplicate local notes
      const localNoteIds = selectedIds.filter(id => !id.startsWith('ticktick-'));
      await duplicateNotes(localNoteIds);
    } catch (error) {
      console.error('Failed to duplicate notes:', error);
    }
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getSourceFilterButtonClass = (mode: 'all' | 'local' | 'ticktick', currentMode: string) => {
    const baseClasses = `
      flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
      whitespace-nowrap
    `;
    if (currentMode === mode) {
      return `${baseClasses} bg-blue-500/20 text-blue-600 dark:text-blue-400 midnight:text-blue-300 font-medium`;
    }
    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const renderTickTickFilterSection = () => {
    if (!isTickTickConnected) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <h3 className="font-semibold text-[var(--color-text)]">TickTick Project</h3>
          </div>
          <button
            onClick={() => setShowTickTickSettings(true)}
            className="text-sm flex items-center gap-1.5 text-[var(--color-primary)] hover:text-[var(--color-primaryDark)]"
          >
            <Settings className="w-3.5 h-3.5" />
            Change Project
          </button>
        </div>

        <div className="p-3 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm mr-2">Current:</span>
              <span className="font-medium text-[var(--color-text)]">
                {currentTickTickProject?.name || 'All Projects'}
              </span>
            </div>
            <div className="flex space-x-2">
              {getSourceFilterButtons()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getSourceFilterButtons = () => {
    return (
      <>
        <button
          onClick={() => setNoteSourceFilter('all')}
          className={getSourceFilterButtonClass('all', noteSourceFilter)}
          title="Show All Notes"
        >
          <Cloud className="w-4 h-4 mr-2" /> All
        </button>
        <button
          onClick={() => setNoteSourceFilter('local')}
          className={getSourceFilterButtonClass('local', noteSourceFilter)}
          title="Show Local Notes Only"
        >
          <Server className="w-4 h-4 mr-2" /> Local
        </button>
        <button
          onClick={() => setNoteSourceFilter('ticktick')}
          className={getSourceFilterButtonClass('ticktick', noteSourceFilter)}
          title="Show TickTick Notes Only"
        >
          TickTick
        </button>
      </>
    );
  };

  const renderNotesList = (notes: NoteWithSource[]) => {
    if (tickTickError && (noteSourceFilter === 'all' || noteSourceFilter === 'ticktick')) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center text-red-500">
          <AlertCircle className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading TickTick Notes</h3>
          <p className="text-sm max-w-md mb-4">{tickTickError}</p>
          <button
            onClick={fetchTickTickNotes}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (noteSourceFilter === 'ticktick' && !isTickTickConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <Server className="w-12 h-12 mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">TickTick Not Connected</h3>
          <p className="text-sm max-w-md mb-4">
            You need to connect your TickTick account to view notes here.
          </p>
          <a
            href="/dashboard/settings/integrations"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Connect TickTick
          </a>
        </div>
      );
    }

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
              : `No ${noteSourceFilter !== 'all' ? noteSourceFilter : ''} notes found. Click the 'New Note' button to create one.`}
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

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
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
                  {noteSourceFilter === 'all'
                    ? `${regularNotes.length + mappedTickTickNotes.length} notes in your collection`
                    : noteSourceFilter === 'local'
                      ? `${regularNotes.length} notes in your collection`
                      : `${mappedTickTickNotes.length} notes in TickTick`}
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    hover:bg-blue-500/10
                    text-blue-500 dark:text-blue-400
                    border border-transparent
                    hover:border-blue-200/30 dark:hover:border-blue-700/30
                    transition-colors
                  `}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Duplicate</span>
                </button>

                <button
                  onClick={() => setShowNewNoteModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    bg-[var(--color-button)]
                    hover:bg-[var(--color-buttonHover)]
                    text-[var(--color-buttonText)]
                    border border-transparent
                    hover:border-gray-200/30 dark:hover:border-gray-700/30
                    transition-colors
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">New Note</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* TickTick Project Info */}
          {isTickTickConnected && renderTickTickFilterSection()}
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
              disabled={noteSourceFilter === 'ticktick'} // Disable graph view for TickTick notes
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

        <DuplicateItemsModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          items={notes}
          onDuplicate={handleDuplicateNotes}
          itemType="note"
        />

        <TickTickSettingsModal
          isOpen={showTickTickSettings}
          onClose={() => setShowTickTickSettings(false)}
          projectId={tickTickProjectId}
          onSave={handleSaveTickTickProjectId}
        />

        {/* Add the TickTickNoteModal */}
        {showTickTickNoteModal && selectedTickTickNote && (
          <TickTickNoteModal
            isOpen={showTickTickNoteModal}
            onClose={handleCloseTickTickNoteModal}
            projectId={selectedTickTickNote.projectId}
            noteId={selectedTickTickNote.noteId}
          />
        )}
      </div>
    </div>
  );
}