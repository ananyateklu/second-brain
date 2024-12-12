import * as Icons from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants } from '../../utils/welcomeBarUtils';
import { DashboardStat } from '../../types/dashboard';
import { LucideIcon } from 'lucide-react';
import {
  StyledStatCard,
  StyledStatContainer,
} from './WelcomeBarStyles';
import { useTheme } from '../../contexts/themeContextUtils';

export function StatsEditor({ isOpen }: { isOpen: boolean }) {
  const { availableStats, toggleStat, getStatValue } = useDashboard();
  const { theme } = useTheme();

  const unusedStats = availableStats.filter((stat: DashboardStat) => !stat.enabled);

  if (!isOpen) return null;

  const getBackgroundClass = () => {
    if (theme === 'midnight') {
      return 'bg-[#1e293b]/95';
    }
    return 'bg-white/50 dark:bg-gray-900/50';
  };

  const getBorderClass = () => {
    if (theme === 'midnight') {
      return 'border-white/20';
    }
    return 'border-[var(--color-border)]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`${getBackgroundClass()} backdrop-blur-xl border ${getBorderClass()} rounded-xl w-full shadow-lg`}
    >
      <div className={`p-4 border-b ${getBorderClass()}`}>
        <h3 className={`text-sm font-medium ${theme === 'midnight' ? 'text-white/90' : 'text-[var(--color-text)]'} flex items-center gap-2`}>
          <Icons.Gauge className="w-4 h-4 text-[var(--color-accent)]" />
          Available Stats
        </h3>
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
                    />
                  </StyledStatContainer>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className={`${theme === 'midnight' ? 'text-white/70' : 'text-[var(--color-textSecondary)]'}`}>
            All stats are currently displayed on the dashboard.
          </p>
        </div>
      )}
    </motion.div>
  );
} 