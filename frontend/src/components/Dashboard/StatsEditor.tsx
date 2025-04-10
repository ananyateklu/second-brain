import { useState } from 'react';
import { File, CheckSquare, Lightbulb, Network, Activity, Tags, FolderPlus, Files, Clock, FileText, Bell, AlignLeft, LucideIcon, RefreshCw, Gauge, RotateCcw, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cardVariants } from '../../utils/welcomeBarUtils';
import { DashboardStat } from '../../types/dashboard';
import { StyledStatCard, StyledStatContainer } from './WelcomeBarStyles';
import { useTheme } from '../../contexts/themeContextUtils';
import { useDashboard } from '../../hooks/useDashboard';

// Map of icon names to components
const Icons = {
  File,
  Files,
  CheckSquare,
  Lightbulb,
  Network,
  Activity,
  Tags,
  Clock,
  FolderPlus,
  FileText,
  Bell,
  AlignLeft,
  RefreshCw,
  Gauge,
  RotateCcw,
  AlertCircle
};

export function StatsEditor({ isOpen }: { isOpen: boolean }) {
  const { availableStats, toggleStat, getStatValue, updateStatOrder, resetStats } = useDashboard();
  const { theme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);

  const unusedStats = availableStats.filter((stat: DashboardStat) => !stat.enabled);

  if (!isOpen) return null;

  const getBackgroundClass = () => {
    if (theme === 'midnight') {
      return 'bg-[#1e293b]/50';
    }
    if (theme === 'dark') {
      return 'bg-gray-900/70';
    }
    if (theme === 'full-dark') {
      return 'bg-[rgba(var(--color-surface-rgb),0.8)]';
    }
    // Increase opacity for light mode
    return 'bg-white/90';
  };

  const getBorderClass = () => {
    if (theme === 'midnight') {
      return 'border-white/10';
    }
    if (theme === 'dark') {
      return 'border-gray-700/50';
    }
    if (theme === 'full-dark') {
      return 'border-[rgba(var(--color-border-rgb),0.5)]';
    }
    // More visible border for light mode
    return 'border-gray-200';
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetStats();
    } catch (error) {
      console.error('Error resetting stats:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`${getBackgroundClass()} backdrop-blur-xl border ${getBorderClass()} rounded-xl w-full shadow-lg z-10`}
    >
      <div className={`p-4 border-b ${getBorderClass()} flex justify-between items-center`}>
        <h3 className={`text-sm font-medium ${theme === 'midnight' ? 'text-white/90' : theme === 'dark' ? 'text-white/90' : theme === 'full-dark' ? 'text-white/90' : 'text-gray-800'} flex items-center gap-2`}>
          <Icons.Gauge className="w-4 h-4 text-[var(--color-accent)]" />
          Available Stats
        </h3>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${theme === 'midnight'
            ? 'bg-white/10 hover:bg-white/20 text-white/80'
            : theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-white/80'
              : theme === 'full-dark'
                ? 'bg-[rgba(var(--color-surface-rgb),0.8)] hover:bg-[rgba(var(--color-surface-rgb),0.9)] text-white/80'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } transition-colors`}
        >
          <Icons.RotateCcw className="w-3 h-3" />
          {isResetting ? 'Resetting...' : 'Reset Stats'}
        </button>
      </div>

      {unusedStats.length > 0 ? (
        <div className="p-3 grid grid-cols-8 gap-2">
          <AnimatePresence mode="popLayout">
            {unusedStats.map((stat: DashboardStat) => {
              const IconComponent = Icons[stat.icon as keyof typeof Icons] as LucideIcon;
              const statValue = getStatValue(stat.id);

              return (
                <motion.div
                  key={stat.id}
                  layout
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover="hover"
                  onClick={() => toggleStat(stat.id)}
                  className="transform origin-center cursor-pointer col-span-1"
                >
                  <StyledStatContainer showStatsEditor={true}>
                    <StyledStatCard
                      stat={stat}
                      statValue={statValue}
                      StatIcon={IconComponent}
                      showStatsEditor={true}
                      onToggleStat={toggleStat}
                      onSizeChange={() => { }}
                      onOrderChange={updateStatOrder}
                    />
                  </StyledStatContainer>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className={`${theme === 'midnight'
            ? 'text-white/70'
            : theme === 'dark'
              ? 'text-gray-400'
              : theme === 'full-dark'
                ? 'text-gray-400'
                : 'text-gray-500'
            }`}>
            All stats are currently displayed on the dashboard.
          </p>
        </div>
      )}
    </motion.div>
  );
} 