import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Clock, Star, Pin, Hash, Archive, Files, Edit, CheckSquare, Bell, Settings, X, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon, LayoutGrid, Layout, Columns } from 'lucide-react';
import { NewNoteModal } from './Notes/NewNoteModal';
import { useNotes } from '../../contexts/NotesContext';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useDashboard } from '../../contexts/DashboardContext';
import { StatsEditor } from './StatsEditor';

// Updated animation variants
const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      bounce: 0.4,
      duration: 0.6
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      type: "spring",
      bounce: 0.2,
      duration: 0.4
    }
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      type: "spring",
      bounce: 0.4,
      duration: 0.3
    }
  }
};

// Add these utility functions
const getIconBg = (type: string) => {
  switch (type) {
    case 'notes':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'new-notes':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'categories':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'word-count':
      return 'bg-purple-100 dark:bg-purple-900/30';
    case 'tags':
      return 'bg-primary-100 dark:bg-primary-900/30';
    case 'time':
      return 'bg-purple-100 dark:bg-purple-900/30';
    case 'ideas':
      return 'bg-amber-100 dark:bg-amber-900/30';
    case 'tasks':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'activity':
      return 'bg-rose-100 dark:bg-rose-900/30';
    case 'search':
      return 'bg-indigo-100 dark:bg-indigo-900/30';
    case 'collaboration':
      return 'bg-teal-100 dark:bg-teal-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30';
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'notes':
      return 'text-blue-600 dark:text-blue-400';
    case 'new-notes':
      return 'text-green-600 dark:text-green-400';
    case 'categories':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'word-count':
      return 'text-purple-600 dark:text-purple-400';
    case 'tags':
      return 'text-primary-600 dark:text-primary-400';
    case 'time':
      return 'text-purple-600 dark:text-purple-400';
    case 'ideas':
      return 'text-amber-600 dark:text-amber-400';
    case 'tasks':
      return 'text-green-600 dark:text-green-400';
    case 'activity':
      return 'text-rose-600 dark:text-rose-400';
    case 'search':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'collaboration':
      return 'text-teal-600 dark:text-teal-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

// Update the IconMap to include all necessary icons and their mappings
const IconMap = {
  FileText,
  Files,      // Total notes
  FolderPlus, // New notes
  Hash,       // Tags
  Tags,       // Categories
  FolderIcon, // Categories (alternative)
  Clock,      // Time
  Lightbulb,  // Ideas
  Share2,     // Sharing
  CheckSquare, // Tasks
  Search,     // Search
  Activity,   // Activity
  AlignLeft,  // Word count
  Plus,
  TagIcon
  // Add any other icons you need
};

// Add these size classes
const sizeClasses = {
  small: {
    colSpan: 'col-span-1',
    fontSize: 'text-xs',
    iconSize: 'w-3.5 h-3.5',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm',
  },
  medium: {
    colSpan: 'col-span-2',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm',
  },
  large: {
    colSpan: 'col-span-3',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm',
  },
};

export function WelcomeBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { notes } = useNotes();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showStatsEditor, setShowStatsEditor] = useState(false);
  const { enabledStats, toggleStat, reorderStats, getStatValue } = useDashboard();

  // Add check for specific paths that should hide the welcome bar
  const hideOnPaths = [
    '/dashboard',           // existing check
    '/dashboard/ai',        // AI Assistant page
    '/dashboard/linked',    // Linked Notes page
    '/dashboard/settings',   // Settings page
    '/dashboard/trash',     // Trash page
    '/dashboard/recent',   // Recents page
    '/dashboard/tags',     // Tags page

  ];

  // Don't show on specified paths
  if (hideOnPaths.includes(location.pathname)) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = {
    pinnedCount: notes.filter(note => note.isPinned).length,
    favoriteCount: notes.filter(note => note.isFavorite).length,
    recentCount: notes.filter(note => {
      const noteDate = new Date(note.updatedAt);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return noteDate > dayAgo;
    }).length,
    totalNotes: notes.length,
    tagsCount: [...new Set(notes.flatMap(note => note.tags))].length,
    archivedCount: notes.filter(note => note.isArchived).length,
    lastEditedNote: notes.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0],
    tasksCount: notes.filter(note => note.type === 'task').length,
    remindersCount: notes.filter(note => note.reminder && new Date(note.reminder) > new Date()).length,
  };

  const handleCreateNote = async (note: { title: string; content: string; tags: string[] }) => {
    addNote(note);
    setShowNewNoteModal(false);
  };

  // Add reorder handler
  const handleReorder = (newOrder: DashboardStat[]) => {
    const updatedStats = newOrder.map((stat, index) => ({
      ...stat,
      order: index
    }));
    reorderStats(0, 0, updatedStats);
  };

  // Add renderStat function
  const renderStat = (stat: DashboardStat) => {
    const statValue = getStatValue(stat.id);
    return (
      <div className="min-w-0 flex-1">
        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {statValue.value}
          {statValue.change && (
            <span className="ml-1 text-xs text-green-600 dark:text-green-400">
              +{statValue.change}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {stat.title}
          {statValue.timeframe && (
            <span className="ml-1 opacity-75">• {statValue.timeframe}</span>
          )}
        </div>
      </div>
    );
  };

  const handleSizeChange = (statId: string, size: 'small' | 'medium' | 'large') => {
    const updatedStats = enabledStats.map(stat => {
      if (stat.id === statId) {
        return { ...stat, size };
      }
      return stat;
    });
    reorderStats(0, 0, updatedStats);
  };

  return (
    <>
      <div className="bg-[#2C2C2E] dark:bg-[#2C2C2E] backdrop-blur-md border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm hover:shadow-md transition-shadow rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4 w-full">
            <div className="w-full">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getGreeting()},{' '}
                  <span className="text-green-400 dark:text-green-400">
                    {user?.name}
                  </span>
                </h1>
                <button
                  onClick={() => setShowStatsEditor(!showStatsEditor)}
                  className="p-2 hover:bg-[#3C3C3E] dark:hover:bg-[#3C3C3E] rounded-lg text-gray-400 dark:text-gray-400 transition-colors"
                  title="Customize stats"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <Reorder.Group
                axis="x"
                values={enabledStats}
                onReorder={handleReorder}
                className="grid grid-cols-8 gap-2"
              >
                <AnimatePresence mode="popLayout">
                  {enabledStats.map((stat, index) => {
                    // Get the icon component from the IconMap
                    const StatIcon = IconMap[stat.icon as keyof typeof IconMap];
                    // Get the stat value here
                    const statValue = getStatValue(stat.id);
                    const size = sizeClasses[stat.size || 'medium'];

                    return (
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
                        <motion.div
                          layout
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          whileHover={showStatsEditor ? 'hover' : undefined}
                          className={`transform origin-center relative w-full h-[80px]`}
                        >
                          <motion.div
                            className={`w-full h-full bg-[#1C1C1E] dark:bg-[#1C1C1E] backdrop-blur-md ${size.padding} rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] hover:border-[#64ab6f] dark:hover:border-[#64ab6f] transition-all cursor-pointer`}
                            whileTap={showStatsEditor ? { scale: 0.95 } : undefined}
                          >
                            <div className="flex flex-col h-full justify-between">
                              {/* Icon and Title */}
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-md ${getIconBg(stat.type)} backdrop-blur-sm`}>
                                  {StatIcon && (
                                    <StatIcon
                                      className={`${size.iconSize} ${getIconColor(stat.type)}`}
                                    />
                                  )}
                                </div>
                                <p className={`${size.titleSize} font-medium text-gray-700 dark:text-gray-300`}>
                                  {stat.title}
                                </p>
                              </div>

                              {/* Value and Change */}
                              <div className="mt-1">
                                <div className="flex items-baseline gap-1">
                                  <span className={`${size.valueSize} font-semibold text-gray-900 dark:text-white ${
                                    statValue.value === '-' ? 'animate-pulse' : ''
                                  }`}>
                                    {statValue.value}
                                  </span>
                                  {statValue.change && statValue.change > 0 && statValue.value !== '-' && (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      +{statValue.change}
                                    </span>
                                  )}
                                </div>
                                {statValue.timeframe && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                                    {statValue.timeframe}
                                  </span>
                                )}
                                {stat.type === 'activity' && statValue.metadata?.breakdown && (
                                  <div className="absolute left-0 right-0 -bottom-24 hidden group-hover:block">
                                    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-2 text-xs">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                          <span className="block font-medium text-gray-900 dark:text-white">
                                            {statValue.metadata.breakdown.created}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400">Created</span>
                                        </div>
                                        <div className="text-center">
                                          <span className="block font-medium text-gray-900 dark:text-white">
                                            {statValue.metadata.breakdown.edited}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400">Edited</span>
                                        </div>
                                        <div className="text-center">
                                          <span className="block font-medium text-gray-900 dark:text-white">
                                            {statValue.metadata.breakdown.deleted}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400">Deleted</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Size controls */}
                            {showStatsEditor && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[#2C2C2E] dark:bg-[#2C2C2E] backdrop-blur-md rounded-lg p-1.5 border border-[#3C3C3E] dark:border-[#3C3C3E]"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSizeChange(stat.id, 'small');
                                  }}
                                  className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'small'
                                      ? 'bg-green-900/30 dark:bg-green-900/30 text-green-400 dark:text-green-400'
                                      : 'hover:bg-[#3C3C3E] dark:hover:bg-[#3C3C3E] text-gray-400 dark:text-gray-400'
                                    }`}
                                  title="Small"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSizeChange(stat.id, 'medium');
                                  }}
                                  className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'medium'
                                      ? 'bg-green-900/30 dark:bg-green-900/30 text-green-400 dark:text-green-400'
                                      : 'hover:bg-[#3C3C3E] dark:hover:bg-[#3C3C3E] text-gray-400 dark:text-gray-400'
                                    }`}
                                  title="Medium"
                                >
                                  <Columns className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSizeChange(stat.id, 'large');
                                  }}
                                  className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'large'
                                      ? 'bg-green-900/30 dark:bg-green-900/30 text-green-400 dark:text-green-400'
                                      : 'hover:bg-[#3C3C3E] dark:hover:bg-[#3C3C3E] text-gray-400 dark:text-gray-400'
                                    }`}
                                  title="Large"
                                >
                                  <Layout className="w-3.5 h-3.5" />
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
                                  toggleStat(stat.id);
                                }}
                              >
                                <div className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-hover shadow-lg">
                                  <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                </div>
                              </motion.button>
                            )}
                          </motion.div>
                        </motion.div>
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Editor */}
      <AnimatePresence>
        {showStatsEditor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white/80 dark:bg-[#111111] backdrop-blur-md border border-gray-200/30 dark:border-[#1C1C1E] shadow-sm mt-4 mb-6 rounded-xl"
          >
            <StatsEditor isOpen={showStatsEditor} />
          </motion.div>
        )}
      </AnimatePresence>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
        onCreateNote={handleCreateNote}
      />
    </>
  );
}