import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ChevronRight,
  PinIcon,
  Plus,
  TagIcon,
  FileText,
  Search,
  Settings,
  X,
  LayoutGrid,
  Layout,
  Lightbulb as LightbulbIcon,
  Share2,
  CheckSquare,
  Edit3,
  AlignLeft,
  Paperclip,
  CheckCircle,
  Columns,
} from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';
import { NoteCard } from './NoteCard';
import { NewNoteModal } from './Notes/NewNoteModal';
import { EditNoteModal } from './Notes/EditNoteModal';
import { StatsEditor } from './StatsEditor';
import { useDashboard } from '../../contexts/DashboardContext';
import { DashboardStat } from '../../types/dashboard';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { getIconColor, getIconBg } from '../../utils/styleUtils';

// Create an icon map
const IconMap = {
  FileText,
  Plus,
  Clock,
  Lightbulb: LightbulbIcon,
  Share2,
  CheckSquare,
  Search,
  Edit3,
  AlignLeft,
  Paperclip,
  CheckCircle,
  TagIcon,
};

// Define the card variants for animations
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: {
      duration: 0.2,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

// Define size-related classes
const sizeClasses = {
  small: {
    colSpan: 'col-span-3', // Smaller span
    aspect: 'aspect-square',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    padding: 'p-3',
  },
  medium: {
    colSpan: 'col-span-4', // Proportional larger span
    aspect: 'aspect-[4/3]',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    padding: 'p-4',
  },
  large: {
    colSpan: 'col-span-6', // Largest span
    aspect: 'aspect-[16/9]',
    fontSize: 'text-lg',
    iconSize: 'w-6 h-6',
    padding: 'p-6',
  },
};

const StatCard = ({
  stat,
  showStatsEditor,
  onRemove,
  renderStat,
  getStatValue,
  index,
}: {
  stat: DashboardStat;
  showStatsEditor: boolean;
  onRemove: (id: string) => void;
  renderStat: (stat: DashboardStat) => number | string;
  getStatValue: (id: string) => { value: number | string; change?: number; timeframe?: string };
  index: number;
}) => {
  const { updateStatSize } = useDashboard();

  // Use the IconMap to get the correct icon component
  const IconComponent = IconMap[stat.icon as keyof typeof IconMap];
  const value = renderStat(stat);
  const size = sizeClasses[stat.size || 'medium'];

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={showStatsEditor ? 'hover' : undefined}
      className={`transform origin-center relative w-full ${size.colSpan} ${size.aspect}`}
      style={{
        position: showStatsEditor ? 'relative' : 'static',
      }}
    >
      <motion.div
        className={`w-full h-full glass-morphism ${size.padding} rounded-lg border border-gray-100 dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-400 transition-all cursor-pointer`}
        whileTap={showStatsEditor ? { scale: 0.95 } : undefined}
      >
        <div className="flex flex-col h-full justify-between">
          {/* Icon and Title */}
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${getIconBg(stat.type)} backdrop-blur-sm`}>
              {IconComponent && (
                <IconComponent
                  className={`${size.iconSize} ${getIconColor(stat.type)}`}
                />
              )}
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {stat.title}
            </p>
          </div>

          {/* Value and Change */}
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span
                className={`${size.fontSize} font-semibold text-gray-900 dark:text-white`}
              >
                {value}
              </span>
              {getStatValue(stat.id).change && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  +{getStatValue(stat.id).change}
                </span>
              )}
            </div>
            {getStatValue(stat.id).timeframe && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                {getStatValue(stat.id).timeframe}
              </span>
            )}
          </div>
        </div>

        {/* Size controls */}
        {showStatsEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 right-2 flex items-center gap-1 bg-white dark:bg-dark-card rounded-lg shadow-lg p-1"
          >
            {/* Size buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'small');
              }}
              className={`p-1 rounded ${stat.size === 'small'
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-dark-hover'
                }`}
              title="Small"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'medium');
              }}
              className={`p-1 rounded ${stat.size === 'medium'
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-dark-hover'
                }`}
              title="Medium"
            >
              <Columns className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'large');
              }}
              className={`p-1 rounded ${stat.size === 'large'
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-dark-hover'
                }`}
              title="Large"
            >
              <Layout className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Remove button */}
        {showStatsEditor && (
          <motion.button
            style={{
              position: 'absolute',
              top: '-0.375rem',
              right: '-0.375rem',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(stat.id);
            }}
          >
            <div className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-hover shadow-lg">
              <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </div>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notes } = useNotes();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showStatsEditor, setShowStatsEditor] = useState(false);
  const { enabledStats, toggleStat, reorderStats, getStatValue } = useDashboard();
  const quickStatsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        quickStatsRef.current &&
        !quickStatsRef.current.contains(event.target as Node) &&
        showStatsEditor
      ) {
        setShowStatsEditor(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatsEditor]);

  const stats = {
    totalNotes: notes.length,
    newThisWeek: notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length,
    pinnedNotes: notes.filter(note => note.isPinned),
    lastUpdated: notes.length > 0
      ? new Date(Math.max(...notes.map(note => new Date(note.updatedAt).getTime())))
      : null
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
  };

  const handleCloseEditModal = () => {
    setSelectedNote(null);
  };

  const renderStat = (stat: DashboardStat) => {
    switch (stat.type) {
      case 'notes':
        if (stat.id === 'total-notes') return stats.totalNotes;
        if (stat.id === 'new-notes') return stats.newThisWeek;
        if (stat.id === 'word-count') return '24.5k';
        if (stat.id === 'attachments') return 34;
        return 0;
      case 'tags':
        return new Set(notes.flatMap(note => note.tags)).size;
      case 'time':
        if (!stats.lastUpdated) return 'No notes yet';
        return formatTimeAgo(stats.lastUpdated);
      case 'ideas':
        return notes.filter(note => note.tags.includes('idea')).length;
      case 'tasks':
        if (stat.id === 'active-tasks') return 12;
        if (stat.id === 'completed-tasks') return 28;
        return 0;
      case 'collaboration':
        return 8;
      case 'search':
        return 'productivity';
      case 'activity':
        return 15;
      default:
        return 0;
    }
  };

  const handleReorder = (newOrder: DashboardStat[]) => {
    // Update the order property of each stat based on its new position
    const updatedStats = newOrder.map((stat, index) => ({
      ...stat,
      order: index
    }));
    reorderStats(0, 0, updatedStats); // Pass the full updated array instead of just indices
  };

  // Update the calculateGridHeight function
  const calculateGridHeight = () => {
    const rows = Math.ceil(enabledStats.length / 4); // 4 is the number of columns in lg view
    const rowHeight = 160; // Approximate height of each stat card in pixels
    // Add extra space when stats editor is open
    return rows * rowHeight + (showStatsEditor ? 400 : 0); // Add buffer for stats editor
  };

  // Add this helper function
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    // For older dates, use a consistent format
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {getGreeting()}, {user?.name}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Here's what's happening with your notes today
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewNoteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="relative" ref={quickStatsRef}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Stats
          </h2>
          <button
            onClick={() => setShowStatsEditor(!showStatsEditor)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg text-gray-600 dark:text-gray-400"
            title="Customize stats"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {enabledStats.length > 0 ? (
          <Reorder.Group
            axis="x"
            values={enabledStats}
            onReorder={handleReorder}
            className="grid grid-cols-10 gap-2"
          >
            <AnimatePresence mode="popLayout">
              {enabledStats.map((stat, index) => (
                <Reorder.Item
                  key={stat.id}
                  value={stat}
                  className={`group relative w-full ${stat.size === 'small' ? 'col-span-1' :
                    stat.size === 'medium' ? 'col-span-2' :
                      stat.size === 'large' ? 'col-span-3' :
                        'col-span-1'
                    }`}
                  initial={false}
                  whileDrag={{
                    scale: 1.05,
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
                    cursor: "grabbing",
                    zIndex: 50
                  }}
                  style={{
                    position: showStatsEditor ? 'relative' : 'static',
                  }}
                  layout
                  dragConstraints={{
                    top: 0,
                    bottom: 0
                  }}
                  dragElastic={0.1}
                  drag={showStatsEditor}
                >
                  <StatCard
                    stat={stat}
                    showStatsEditor={showStatsEditor}
                    onRemove={toggleStat}
                    renderStat={renderStat}
                    getStatValue={getStatValue}
                    index={index}
                  />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        ) : (
          <div className="glass-morphism p-8 rounded-xl text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No stats added yet. Click the settings icon to add some stats.
            </p>
          </div>
        )}

        {/* Stats Editor */}
        <AnimatePresence>
          {showStatsEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
            >
              <StatsEditor isOpen={showStatsEditor} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pinned Notes */}
      {stats.pinnedNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PinIcon className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pinned Notes
              </h2>
            </div>
            <button
              onClick={() => navigate('/dashboard/notes')}
              className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.pinnedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="cursor-pointer"
              >
                <NoteCard note={note} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600 dark:text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
          </div>
          <button
            onClick={() => navigate('/dashboard/notes')}
            className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.slice(0, 3).map(note => (
            <div
              key={note.id}
              onClick={() => handleEditNote(note)}
              className="cursor-pointer"
            >
              <NoteCard note={note} />
            </div>
          ))}
        </div>
      </div>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
      />

      <EditNoteModal
        isOpen={selectedNote !== null}
        onClose={handleCloseEditModal}
        note={selectedNote}
      />
    </div>
  );
}