import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Clock, Hash, Files, CheckSquare, Settings, X, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon, LayoutGrid, Layout, Columns, Network, AlertCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { StatsEditor } from './StatsEditor';
import { DashboardStat } from '../../types/dashboard';
import { getIconBg, getIconColor } from '../../utils/dashboardUtils';
import { cardVariants, sizeClasses } from '../../utils/welcomeBarUtils';
import { StatValue } from '../../utils/dashboardContextUtils';

const IconMap = {
  FileText,
  Files,
  FolderPlus,
  Hash,
  Tags,
  FolderIcon,
  Clock,
  Lightbulb,
  Share2,
  CheckSquare,
  Search,
  Activity,
  AlignLeft,
  Plus,
  TagIcon,
  Network,
  AlertCircle,
  Bell
};

const getWidthFromSize = (size?: string) => {
  switch (size) {
    case 'small': return 1;
    case 'medium': return 2;
    case 'large': return 4;
    default: return 1;
  }
};

const getColumnSpan = (size?: string) => {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-2';
    case 'large': return 'col-span-4';
    default: return 'col-span-1';
  }
};

function findNextAvailablePosition(rows: number[][], width: number, columnCount: number): { row: number; col: number } {
  for (let r = 0; ; r++) {
    if (!rows[r]) {
      rows[r] = Array(columnCount).fill(0);
    }

    for (let col = 0; col <= columnCount - width; col++) {
      if (rows[r].slice(col, col + width).every(cell => cell === 0)) {
        return { row: r, col };
      }
    }
  }
}

function tryPlaceAtPosition(rows: number[][], row: number, col: number, width: number, columnCount: number): boolean {
  if (col + width > columnCount) return false;

  if (!rows[row]) {
    rows[row] = Array(columnCount).fill(0);
  }

  const canPlace = rows[row].slice(col, col + width).every(cell => cell === 0);
  if (canPlace) {
    for (let c = 0; c < width; c++) {
      rows[row][col + c] = 1;
    }
  }
  return canPlace;
}

function layoutItems(items: DashboardStat[]): DashboardStat[] {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const columnCount = 8;
  const rows: number[][] = [];

  return sorted.map(item => {
    const width = getWidthFromSize(item.size);
    const desiredRow = item.gridPosition?.row ?? Math.floor((item.order ?? 0) / columnCount);
    const desiredCol = item.gridPosition?.col ?? (item.order ?? 0) % columnCount;

    if (tryPlaceAtPosition(rows, desiredRow, desiredCol, width, columnCount)) {
      return {
        ...item,
        gridPosition: { row: desiredRow, col: desiredCol },
        order: desiredRow * columnCount + desiredCol,
        enabled: true
      };
    }

    const { row, col } = findNextAvailablePosition(rows, width, columnCount);
    for (let c = 0; c < width; c++) {
      rows[row][col + c] = 1;
    }

    return {
      ...item,
      gridPosition: { row, col },
      order: row * columnCount + col,
      enabled: true
    };
  });
}

interface WelcomeBarProps {
  isDashboardHome?: boolean;
}

export function WelcomeBar({ isDashboardHome = false }: WelcomeBarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [showStatsEditor, setShowStatsEditor] = useState(false);
  const { enabledStats, toggleStat, reorderStats, getStatValue } = useDashboard();
  const displayedStats = useMemo(() => layoutItems(enabledStats), [enabledStats]);

  const hideOnPaths = [
    '/dashboard/ai',
    '/dashboard/linked',
    '/dashboard/settings',
    '/dashboard/trash',
    '/dashboard/recent',
    '/dashboard/tags',
  ];

  if (!isDashboardHome && (location.pathname === '/dashboard' || hideOnPaths.includes(location.pathname))) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Called when user finishes dragging an item and Framer Motion provides a new order.
   * We must:
   * 1. Update sortOrder based on the new item array sequence.
   * 2. Re-run layout to find stable (row, col) for all items.
   * 3. Update state with new layout.
   */
  const handleReorder = (newOrder: DashboardStat[]) => {
    // Calculate positions considering item sizes
    const updatedWithOrder = newOrder.map((stat, index) => {
      // Calculate position based on previous items' sizes
      let currentCol = 0;
      let currentRow = 0;

      // Sum up widths of previous items to find the correct position
      for (let i = 0; i < index; i++) {
        const prevWidth = getWidthFromSize(newOrder[i].size);
        currentCol += prevWidth;

        // If this item would overflow the row, move to next row
        if (currentCol > 8) {
          currentRow++;
          currentCol = 0;
          currentCol += prevWidth;
        }
      }

      // If this item would overflow, move to next row
      if (currentCol + getWidthFromSize(stat.size) > 8) {
        currentRow++;
        currentCol = 0;
      }

      return {
        ...stat,
        order: currentRow * 8 + currentCol,
        gridPosition: {
          row: currentRow,
          col: currentCol
        },
        enabled: true
      };
    });

    // Compute stable layout with new positions
    const laidOut = layoutItems(updatedWithOrder);
    reorderStats(laidOut[0].order, laidOut[laidOut.length - 1].order, laidOut);
  };

  const handleSizeChange = (statId: string, size: 'small' | 'medium' | 'large') => {
    // Update size and re-run layout
    const updatedStats = enabledStats.map(stat => {
      if (stat.id === statId) {
        return { ...stat, size };
      }
      return stat;
    });

    // Re-layout after size change
    const laidOut = layoutItems(updatedStats);
    reorderStats(laidOut[0].order, laidOut[laidOut.length - 1].order, laidOut);
  };

  return (
    <div
      className={`
        relative 
        overflow-hidden 
        rounded-2xl 
        bg-white/20
        dark:bg-slate-900/20
        border-[1.5px] 
        border-white/40
        dark:border-white/20
        backdrop-blur-xl 
        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
        dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
        dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
        ring-1
        ring-black/5
        dark:ring-white/10
        hover:ring-black/10
        dark:hover:ring-white/20
        transition-all 
        duration-300 
        p-6 
        mb-6
      `}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {location.pathname !== '/dashboard' && user?.avatar && (
                  <img
                    src={user.avatar}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                )}
                <h1 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-1">
                  {location.pathname === '/dashboard' ? (
                    'Quick Stats'
                  ) : (
                    <>
                      {getGreeting()},{' '}
                      <span className="text-[var(--color-accent)]">{user?.name}</span>
                    </>
                  )}
                </h1>
              </div>
              <button
                onClick={() => setShowStatsEditor(!showStatsEditor)}
                className="p-2 hover:bg-white/10 rounded-lg text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-all duration-200"
                title="Customize stats"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <Reorder.Group
            values={displayedStats}
            onReorder={handleReorder}
            className="grid grid-cols-8 auto-rows-[100px] gap-4"
            layoutScroll
            as="div"
            style={{
              listStyle: 'none',
              display: 'grid',
              width: '100%',
              position: 'relative',
              gridAutoFlow: 'dense'
            }}
          >
            <AnimatePresence mode="sync">
              {displayedStats.map((stat: DashboardStat) => {
                const StatIcon = IconMap[stat.icon as keyof typeof IconMap];
                const statValue: StatValue = getStatValue(stat.id);
                const size = sizeClasses[stat.size || 'medium'];
                const colSpan = getWidthFromSize(stat.size);

                return (
                  <Reorder.Item
                    key={stat.id}
                    value={stat}
                    className={`group relative w-full ${getColumnSpan(stat.size)}`}
                    initial={false}
                    whileDrag={{
                      scale: 1.02,
                      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
                      cursor: "grabbing",
                      zIndex: 50
                    }}
                    style={{
                      position: showStatsEditor ? 'relative' : 'static',
                      transformOrigin: 'center',
                      gridColumn: `span ${colSpan}`,
                      gridRow: 'auto',
                      transition: showStatsEditor ? 'none' : 'var(--theme-transition)'
                    }}
                    layout="position"
                    dragConstraints={false}
                    dragElastic={0.2}
                    dragMomentum={false}
                    dragTransition={{
                      bounceStiffness: 600,
                      bounceDamping: 30
                    }}
                    drag={showStatsEditor}
                  >
                    <motion.div
                      layout
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover={showStatsEditor ? 'hover' : undefined}
                      className="transform origin-center relative w-full h-[100px]"
                    >
                      <motion.div
                        className={`
                          w-full
                          h-full 
                          bg-white/20 
                          dark:bg-slate-900/20
                          backdrop-blur-xl 
                          ${size.padding} 
                          rounded-lg 
                          border-[1.5px]
                          border-white/40
                          dark:border-white/20
                          hover:border-[var(--color-accent)]
                          transition-all 
                          duration-300 
                          cursor-pointer
                          ${size.height}
                          shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
                          dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
                          hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
                          dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
                          hover:bg-white/30
                          dark:hover:bg-slate-900/30
                          hover:-translate-y-1
                          hover:scale-[1.02]
                          ring-1
                          ring-black/5
                          dark:ring-white/10
                          hover:ring-black/10
                          dark:hover:ring-white/20
                        `}
                        whileTap={showStatsEditor ? { scale: 0.95 } : undefined}
                      >
                        <div className="flex flex-col h-full justify-between">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${getIconBg(stat.type)} backdrop-blur-xl shadow-md ring-1 ring-black/5 dark:ring-white/10`}>
                                  {StatIcon && (
                                    <StatIcon
                                      className={`${size.iconSize} ${getIconColor(stat.type)}`}
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <p className={`${size.titleSize} font-semibold text-[var(--color-text)]`}>
                                    {stat.title}
                                  </p>
                                  {(stat.size === 'medium' || stat.size === 'large') && statValue.description && (
                                    <p className="text-[10px] text-[var(--color-textSecondary)] opacity-90 line-clamp-1">
                                      {statValue.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {(statValue.metadata?.breakdown || statValue.topBreakdown) && stat.size === 'large' && (
                                <div className="flex items-center justify-center gap-12">
                                  {statValue.topBreakdown && (
                                    <div className="flex items-center gap-8">
                                      <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-[var(--color-textSecondary)]">
                                          active
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--color-text)]">
                                          {statValue.topBreakdown.active}
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-[var(--color-textSecondary)]">
                                          archived
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--color-text)]">
                                          {statValue.topBreakdown.archived}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {statValue.metadata?.breakdown && (
                                    <div className="flex items-center gap-8">
                                      {Object.entries(statValue.metadata.breakdown).map(([key, value]) => (
                                        <div key={key} className="flex flex-col items-end">
                                          <span className="text-xs font-medium text-[var(--color-textSecondary)]">
                                            {key}
                                          </span>
                                          <span className="text-sm font-semibold text-[var(--color-text)]">
                                            {value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`${size.valueSize} font-bold text-[var(--color-text)]`}>
                                  {statValue.value}
                                </span>
                                {statValue.change && statValue.change > 0 && (
                                  <span className="text-xs text-[var(--color-accent)] font-semibold">
                                    +{statValue.change}
                                  </span>
                                )}
                              </div>

                              {statValue.additionalInfo && stat.size !== 'small' && (
                                <div className="flex items-center gap-3">
                                  {statValue.additionalInfo.map((info, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                      {info.icon && (
                                        <info.icon className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                                      )}
                                      <span className="text-xs text-[var(--color-textSecondary)]">
                                        {info.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {statValue.timeframe && (
                              <span className="text-[10px] text-[var(--color-textSecondary)] opacity-90 mt-0.5 block">
                                {statValue.timeframe}
                              </span>
                            )}
                          </div>
                        </div>

                        {showStatsEditor && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[var(--color-surface)]/90 backdrop-blur-xl rounded-lg p-1.5 border border-[var(--color-border)]"
                            style={{ transition: 'var(--theme-transition)' }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSizeChange(stat.id, 'small');
                              }}
                              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'small'
                                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
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
                                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
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
                                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                                }`}
                              title="Large"
                            >
                              <Layout className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        )}

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
                            <div className="p-1 rounded-full bg-[var(--color-surface)]/90 hover:bg-[var(--color-surfaceHover)] backdrop-blur-xl border border-[var(--color-border)] shadow-lg transition-all duration-200">
                              <X className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]" />
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

          <AnimatePresence>
            {showStatsEditor && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: '2rem' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
              >
                <StatsEditor isOpen={showStatsEditor} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
