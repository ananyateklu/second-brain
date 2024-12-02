import { useState, useRef, useEffect } from 'react';
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
  Share2,
  CheckSquare,
  Edit3,
  AlignLeft,
  Paperclip,
  CheckCircle,
  Columns,
  LightbulbIcon,
} from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { useAuth } from '../../hooks/useAuth';
import { NoteCard } from './NoteCard';
import { NewNoteModal } from './Notes/NewNoteModal';
import { StatsEditor } from './StatsEditor';
import { useDashboard } from '../../contexts/DashboardContext';
import { DashboardStat } from '../../types/dashboard';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { getIconColor, getIconBg } from '../../utils/styleUtils';
import { useTasks } from '../../contexts/TasksContext';
import { useModal } from '../../contexts/ModalContext';
import { Note } from '../../types/note';
import { WelcomeSection } from './WelcomeSection';

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

interface StatValue {
  value: string | number;
  change?: number;
  timeframe?: string;
  metadata?: {
    breakdown?: {
      created: number;
      edited: number;
      deleted: number;
    };
  };
}

const StatCard = ({
  stat,
  showStatsEditor,
  onRemove,
  getStatValue
}: {
  stat: DashboardStat;
  showStatsEditor: boolean;
  onRemove: (id: string) => void;
  getStatValue: (id: string) => StatValue;
}) => {
  const { updateStatSize } = useDashboard();

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
        className={`w-full h-full bg-[#1C1C1E] dark:bg-[#1C1C1E] backdrop-blur-md ${size.padding} rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] hover:border-[#64ab6f] dark:hover:border-[#64ab6f] transition-all cursor-pointer`}
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
              <span className={`${size.valueSize} font-semibold text-gray-900 dark:text-white ${statValue.value === '-' ? 'animate-pulse' : ''
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
            className="absolute bottom-2 right-2 flex items-center gap-1.5 glass-morphism rounded-lg p-1.5 border border-gray-100/20 dark:border-white/5"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatSize(stat.id, 'small');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'small'
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
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'medium'
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
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'large'
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
    completedTasks: tasks.filter(task => task.status === 'Completed').length
  };

  const handleEditNote = (note: Note) => {
    if (note.isIdea) {
      setSelectedIdea({ ...note, isFavorite: false, isArchived: false, isDeleted: false, linkedNoteIds: [] });
    } else {
      setSelectedNote({ ...note, isFavorite: false, isArchived: false, isDeleted: false, linkedNoteIds: [] });
    }
  };

  const handleReorder = (newOrder: DashboardStat[]) => {
    const updatedStats = newOrder.map((stat, index) => ({
      ...stat,
      order: index
    }));
    reorderStats(0, 0, updatedStats);
  };

  const getStatSpanClass = (size: string) => {
    switch (size) {
      case 'medium': return 'col-span-2';
      case 'large': return 'col-span-3';
      default: return 'col-span-1';
    }
  };

  return (
    <div
      className="space-y-8"
      style={{
        contain: 'content'
      }}
    >
      {/* Welcome Section */}
      <div
        className="bg-white/20 dark:bg-[#2C2C2E] border border-gray-200/30 dark:border-[#3C3C3E]/30 shadow-sm rounded-xl"
        data-type="welcome-section"
      >
        <div className="p-6">
          <WelcomeSection
            user={{ ...user!, experience: user!.experiencePoints }}
            onNewNote={() => setShowNewNoteModal(true)}
            onNavigate={navigate}
            stats={stats}
            tasks={tasks.map(task => ({
              ...task,
              status: task.status === 'Incomplete' ? 'Pending' : task.status,
              dueDate: task.dueDate ?? undefined
            }))}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white/20 dark:bg-[#2C2C2E] border border-gray-200/30 dark:border-[#3C3C3E]/30 shadow-sm p-6 rounded-xl">
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
              {enabledStats.map((stat) => (
                <Reorder.Item
                  key={stat.id}
                  value={stat}
                  className={`group relative w-full ${getStatSpanClass(stat.size)}`}
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
        <div className="bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm p-6 rounded-xl">
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
              <button
                key={note.id}
                onClick={() => handleEditNote(note)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditNote(note)}
                className="w-full text-left cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
                tabIndex={0}
              >
                <NoteCard note={note} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-4">
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
            <button
              key={note.id}
              onClick={() => handleEditNote(note)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditNote(note)}
              className="w-full text-left cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
              tabIndex={0}
            >
              <NoteCard note={note} />
            </button>
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