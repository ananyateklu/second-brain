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
  Lightbulb,
  LightbulbIcon,
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
import { StatsEditor } from './StatsEditor';
import { useDashboard } from '../../contexts/DashboardContext';
import { DashboardStat } from '../../types/dashboard';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { getIconColor, getIconBg } from '../../utils/styleUtils';
import { useTasks } from '../../contexts/TasksContext';
import { textStyles } from '../../utils/textUtils';
import { useModal } from '../../contexts/ModalContext';
import { Note } from '../../types/note';

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

const StatCard = ({
  stat,
  showStatsEditor,
  onRemove,
  getStatValue,
  index,
}: {
  stat: DashboardStat;
  showStatsEditor: boolean;
  onRemove: (id: string) => void;
  getStatValue: (id: string) => { value: number | string; change?: number; timeframe?: string };
  index: number;
}) => {
  const { updateStatSize } = useDashboard();

  // Use the IconMap to get the correct icon component
  const IconComponent = IconMap[stat.icon as keyof typeof IconMap];
  const statValue = getStatValue(stat.id);
  const size = sizeClasses[stat.size || 'medium'];

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={showStatsEditor ? 'hover' : undefined}
      className={`transform origin-center relative w-full h-[80px]`}
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
              {statValue.change && statValue.value !== '-' && (
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
            className="absolute bottom-2 right-2 flex items-center gap-1.5 glass-morphism rounded-lg p-1.5 border border-gray-100/20 dark:border-white/5"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'small');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${
                stat.size === 'small'
                  ? 'bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-gray-100/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
              }`}
              title="Small"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'medium');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${
                stat.size === 'medium'
                  ? 'bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-gray-100/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
              }`}
              title="Medium"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'large');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${
                stat.size === 'large'
                  ? 'bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-gray-100/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
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
  const { tasks } = useTasks();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const { setSelectedNote, setSelectedIdea } = useModal();
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
      : null,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.completed).length
  };

  const handleEditNote = (note: Note) => {
    if (note.isIdea) {
      setSelectedIdea(note);
    } else {
      setSelectedNote(note);
    }
  };

  const handleCloseEditModal = () => {
    setSelectedNote(null);
  };

  const renderStat = (stat: DashboardStat) => {
    switch (stat.type) {
      case 'notes':
        if (stat.id === 'total-notes') return stats.totalNotes;
        if (stat.id === 'new-notes') return stats.newThisWeek;
        if (stat.id === 'word-count') {
          // Calculate total word count across all notes
          return notes.reduce((total, note) => {
            const wordCount = note.content.trim().split(/\s+/).length;
            return total + wordCount;
          }, 0).toLocaleString();
        }
        return 0;
        
      case 'tags':
        // Get unique tags count
        return new Set(notes.flatMap(note => note.tags)).size;
        
      case 'time':
        if (!stats.lastUpdated) return 'No notes yet';
        return formatTimeAgo(stats.lastUpdated);
        
      case 'ideas':
        // Remove this case entirely as it's now handled by the getStatValue function
        return '';
        
      case 'tasks':
        if (stat.id === 'active-tasks') {
          return notes.filter(note => 
            note.content.includes('[ ]') || 
            note.content.includes('[]')
          ).length;
        }
        if (stat.id === 'completed-tasks') {
          return notes.filter(note => 
            note.content.includes('[x]') || 
            note.content.includes('[X]')
          ).length;
        }
        return 0;
        
      case 'collaboration':
        // Count shared notes
        return notes.filter(note => note.shared?.length > 0).length;
        
      case 'search':
        // This would need integration with search history
        return '';
        
      case 'activity':
        // Count notes modified today
        const today = new Date();
        return notes.filter(note => {
          const updateDate = new Date(note.updatedAt);
          return updateDate.toDateString() === today.toDateString();
        }).length;
        
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

  interface WelcomeSectionProps {
    user: any;
    onNewNote: () => void;
    onNavigate: (path: string) => void;
    stats: {
      totalNotes: number;
      totalTasks: number;
      completedTasks: number;
    };
    tasks: any[];
  }

// First, let's separate the welcome section into its own memoized component
const WelcomeSection = React.memo(({ user, onNewNote, onNavigate, tasks }: WelcomeSectionProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Gradient overlays */}
      <div 
        className="absolute top-0 right-0 w-[400px] h-[400px] opacity-30"
        style={{
          background: 'radial-gradient(circle, var(--primary-500-alpha) 0%, transparent 70%)',
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-[300px] h-[300px] opacity-30"
        style={{
          background: 'radial-gradient(circle, var(--amber-500-alpha) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        {/* Left Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className={textStyles.h1}>
                {getGreeting()}, {user?.name}
              </h1>
              <span 
                className="inline-block animate-wave"
                style={{ transformOrigin: '70% 70%' }}
              >
                👋
              </span>
            </div>
            <p className={textStyles.bodySmall}>
              Ready to capture your thoughts and ideas?
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onNewNote}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">New Note</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/tasks')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:-translate-y-0.5"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="font-medium text-sm">New Task</span>
            </button>
            <button
              onClick={() => onNavigate('/dashboard/ideas')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 hover:-translate-y-0.5"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium text-sm">Capture Idea</span>
            </button>
          </div>
        </div>

        {/* Right Section - Summary */}
        <div className="relative bg-white/10 dark:bg-white/5 rounded-lg p-3 space-y-2 min-w-[260px] border border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-gray-100/50 dark:bg-white/10 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-green-100/50 dark:bg-green-500/10 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-green-600 dark:text-green-500">
                {tasks.filter(task => task.status === 'completed').length}
              </span>
              <span className="ml-1 text-sm">tasks completed today</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="p-1.5 bg-blue-100/50 dark:bg-blue-500/10 rounded-lg">
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-500">
                {notes.filter(note => {
                  const today = new Date();
                  return new Date(note.updatedAt).toDateString() === today.toDateString();
                }).length}
              </span>
              <span className="ml-1 text-sm">notes updated today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

  return (
    <div 
      className="space-y-8"
      style={{
        contain: 'content'
      }}
    >
      {/* Welcome Section - With data-type attribute to differentiate it */}
      <div 
        className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl"
        data-type="welcome-section"
      >
        <div className="p-6">
          <WelcomeSection 
            user={user}
            onNewNote={() => setShowNewNoteModal(true)}
            onNavigate={navigate}
            stats={stats}
            tasks={tasks}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Stats
          </h2>
          <button
            onClick={() => setShowStatsEditor(!showStatsEditor)}
            className="p-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
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
            className="grid grid-cols-8 gap-2"
          >
            <AnimatePresence mode="popLayout">
              {enabledStats.map((stat, index) => (
                <Reorder.Item
                  key={stat.id}
                  value={stat}
                  className={`group relative w-full ${stat.size === 'small' ? 'col-span-1' :   // Base size (1/8)
                      stat.size === 'medium' ? 'col-span-2' :  // Double width (2/8)
                        stat.size === 'large' ? 'col-span-3' :   // Triple width (3/8)
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
        <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
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
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {stats.pinnedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
              >
                <NoteCard note={note} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm p-6 rounded-xl">
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
              className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
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
    </div>
  );
}