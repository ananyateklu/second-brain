import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Clock, Hash, Files, CheckSquare, Settings, X, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon, LayoutGrid, Layout, Columns } from 'lucide-react';
import { NewNoteModal } from './Notes/NewNoteModal';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { StatsEditor } from './StatsEditor';
import { DashboardStat } from '../../types/dashboard';
import { getIconBg, getIconColor } from '../../utils/dashboardUtils';
import { cardVariants, sizeClasses } from '../../utils/welcomeBarUtils';

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

  // Add reorder handler
  const handleReorder = (newOrder: DashboardStat[]) => {
    const updatedStats = newOrder.map((stat, index) => ({
      ...stat,
      order: index
    }));
    reorderStats(0, 0, updatedStats);
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
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4 w-full">
            <div className="w-full">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-semibold text-[var(--color-text)]">
                  {getGreeting()},{' '}
                  <span className="text-[var(--color-accent)]">
                    {user?.name}
                  </span>
                </h1>
                <button
                  onClick={() => setShowStatsEditor(!showStatsEditor)}
                  className="p-2 hover:bg-[var(--color-surface)]/80 rounded-lg text-[var(--color-textSecondary)] transition-colors"
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
                  {enabledStats.map((stat: DashboardStat) => {
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
                            className={`w-full h-full bg-[var(--color-surface)] backdrop-blur-md ${size.padding} rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all cursor-pointer`}
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
                                <p className={`${size.titleSize} font-medium text-[var(--color-text)]`}>
                                  {stat.title}
                                </p>
                              </div>

                              {/* Value and Change */}
                              <div className="mt-1">
                                <div className="flex items-baseline gap-1">
                                  <span className={`${size.valueSize} font-semibold text-[var(--color-text)] ${statValue.value === '-' ? 'animate-pulse' : ''
                                    }`}>
                                    {statValue.value}
                                  </span>
                                  {statValue.change && statValue.change > 0 && statValue.value !== '-' && (
                                    <span className="text-xs text-[var(--color-accent)]">
                                      +{statValue.change}
                                    </span>
                                  )}
                                </div>
                                {statValue.timeframe && (
                                  <span className="text-[10px] text-[var(--color-textSecondary)] block">
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
                                className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[var(--color-surface)] backdrop-blur-md rounded-lg p-1.5 border border-[var(--color-border)]"
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
            className="bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] shadow-sm mt-4 mb-6 rounded-xl"
          >
            <StatsEditor isOpen={showStatsEditor} />
          </motion.div>
        )}
      </AnimatePresence>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
      />
    </>
  );
}