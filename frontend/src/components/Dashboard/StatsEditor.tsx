import React from 'react';
import * as Icons from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { getIconBg, getIconColor } from '../../utils/dashboardUtils';
import { DashboardStat } from '../../types/dashboard';

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.8
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: {
      duration: 0.2
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};

export function StatsEditor({ isOpen }: { isOpen: boolean }) {
  const { availableStats, toggleStat, getStatValue } = useDashboard();

  const unusedStats = availableStats.filter((stat: DashboardStat) => !stat.enabled);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-xl w-full shadow-lg"
    >
      <div className="p-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2">
          <Icons.Gauge className="w-4 h-4 text-[var(--color-accent)]" />
          Available Stats
        </h3>
      </div>

      {unusedStats.length > 0 ? (
        <div className="p-3 grid grid-cols-8 gap-2">
          <AnimatePresence mode="popLayout">
            {unusedStats.map((stat: DashboardStat) => {
              const IconComponent = Icons[stat.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
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
                  <motion.div
                    className="w-full h-[100px] bg-[var(--color-surface)]/80 backdrop-blur-xl p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-300"
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className={`p-1 rounded-md ${getIconBg(stat.type)} backdrop-blur-xl`}>
                          {IconComponent && (
                            <IconComponent className={`w-4 h-4 ${getIconColor(stat.type)}`} />
                          )}
                        </div>
                        <p className="text-xs font-medium text-[var(--color-text)]">
                          {stat.title}
                        </p>
                      </motion.div>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                          {statValue.value}
                        </span>
                      </div>

                      <motion.div
                        className="flex items-center gap-1 group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span className="text-xs font-medium text-[var(--color-accent)] group-hover:text-[var(--color-accent)]/80 transition-colors">
                          Add
                        </span>
                        <Icons.Plus className="w-3 h-3 text-[var(--color-accent)] group-hover:text-[var(--color-accent)]/80 transition-colors" />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-[var(--color-textSecondary)]">
            All stats are currently displayed on the dashboard.
          </p>
        </div>
      )}
    </motion.div>
  );
} 