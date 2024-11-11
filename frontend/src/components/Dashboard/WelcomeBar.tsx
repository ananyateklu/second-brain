import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Clock, Star, Pin, Hash, Archive, Files, Edit, CheckSquare, Bell, Settings, X, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon } from 'lucide-react';
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

export function WelcomeBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { notes } = useNotes();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showStatsEditor, setShowStatsEditor] = useState(false);
  const { enabledStats, toggleStat, reorderStats } = useDashboard();

  // Add check for specific paths that should hide the welcome bar
  const hideOnPaths = [
    '/dashboard',           // existing check
    '/dashboard/ai',        // AI Assistant page
    '/dashboard/linked',    // Linked Notes page
    '/dashboard/settings',   // Settings page
    '/dashboard/trash',     // Trash page
    '/dashboard/recent',   // Recents page
    

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
    switch (stat.type) {
      case 'notes':
        return notes.filter(note => !note.isArchived && !note.isDeleted).length;
      
      case 'tags':
        return [...new Set(notes.flatMap(note => note.tags))].length;
      
      case 'time':
        const lastEdited = notes.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        if (!lastEdited) return 'No notes';
        const timeAgo = formatTimeAgo(new Date(lastEdited.updatedAt));
        return timeAgo;
      
      case 'ideas':
        return notes.filter(note => note.tags.includes('idea')).length;
      
      case 'tasks':
        return notes.filter(note => 
          note.content.includes('[ ]') || 
          note.content.includes('[]')
        ).length;
      
      case 'activity':
        const today = new Date();
        return notes.filter(note => {
          const updateDate = new Date(note.updatedAt);
          return updateDate.toDateString() === today.toDateString();
        }).length;
      
      case 'search':
        return ''; // Implement based on your search functionality
      
      case 'collaboration':
        return notes.filter(note => note.shared?.length > 0).length;
      
      default:
        return 0;
    }
  };

  // Add helper function for time formatting
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div 
        className="relative glass-morphism p-4 rounded-xl mb-4 transform-gpu"
        style={{
          willChange: 'transform', // Hint to browser about animations
          contain: 'content' // Improve rendering performance
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4 w-full">
            <div className="w-full">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getGreeting()},{' '}
                  <span className="text-primary-600 dark:text-primary-400">
                    {user?.name}
                  </span>
                </h1>
                <button
                  onClick={() => setShowStatsEditor(!showStatsEditor)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg text-gray-600 dark:text-gray-400"
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
                className="grid grid-cols-5 gap-2 mt-3 mb-3"
              >
                <AnimatePresence mode="popLayout">
                  {enabledStats.map((stat) => {
                    const IconComponent = IconMap[stat.icon as keyof typeof IconMap];
                    
                    return (
                      <Reorder.Item
                        key={stat.id}
                        value={stat}
                        className="col-span-1"
                        drag={showStatsEditor}
                      >
                        <motion.div
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="glass-morphism p-2 rounded-lg border border-gray-200/20 dark:border-gray-700/30"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 ${getIconBg(stat.type)} rounded-md`}>
                              {IconComponent && (
                                <IconComponent 
                                  className={`w-4 h-4 ${getIconColor(stat.type)}`}
                                />
                              )}
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {renderStat(stat)}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {stat.title}
                              </div>
                            </div>
                          </div>

                          {showStatsEditor && (
                            <motion.button
                              className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStat(stat.id);
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            </motion.button>
                          )}
                        </motion.div>
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>

              {/* Updated Secondary Stats with better descriptions */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-gray-200/20 dark:border-gray-700/30">
                <div className="stat-item-compact text-gray-600 dark:text-gray-400">
                  <Files className="w-3.5 h-3.5" />
                  <span>{stats.totalNotes} total notes</span>
                </div>
                <div className="stat-item-compact text-gray-600 dark:text-gray-400">
                  <Hash className="w-3.5 h-3.5" />
                  <span>{stats.tagsCount} unique tags</span>
                </div>
                <div className="stat-item-compact text-gray-600 dark:text-gray-400">
                  <Archive className="w-3.5 h-3.5" />
                  <span>{stats.archivedCount} archived</span>
                </div>
                {stats.lastEditedNote && (
                  <div className="stat-item-compact text-gray-600 dark:text-gray-400">
                    <Edit className="w-3.5 h-3.5" />
                    <span title={stats.lastEditedNote.title}>
                      Last edited: {stats.lastEditedNote.title.length > 15 
                        ? `${stats.lastEditedNote.title.substring(0, 15)}...` 
                        : stats.lastEditedNote.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Smaller Action Buttons */}
          <div className="flex gap-2 self-start sm:self-center">
            <button
              onClick={() => setShowNewNoteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Editor Modal */}
      <AnimatePresence>
        {showStatsEditor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-morphism mt-4 p-4 rounded-xl"
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