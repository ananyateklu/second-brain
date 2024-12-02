import React from 'react';
import * as Icons from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getIconBg } from '../../utils/dashboardUtils';

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

  const unusedStats = availableStats.filter(stat => !stat.enabled);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#1C1C1E] dark:bg-[#1C1C1E] backdrop-blur-md border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl w-full"
    >
      <div className="p-4 border-b border-gray-200/30 dark:border-[#1C1C1E]">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Icons.Gauge className="w-4 h-4" />
          Available Stats
        </h3>
      </div>

      {unusedStats.length > 0 ? (
        <div className="p-3 grid grid-cols-8 gap-2">
          <AnimatePresence mode="popLayout">
            {unusedStats.map((stat) => {
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
                    className="w-full h-[100px] bg-[#1C1C1E] dark:bg-[#1C1C1E] backdrop-blur-md p-3 rounded-lg border border-[#2C2C2E] dark:border-[#2C2C2E] hover:border-[#64ab6f] dark:hover:border-[#64ab6f] transition-all"
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className={`p-1 rounded-md ${getIconBg(stat.type)} backdrop-blur-sm`}>
                          {IconComponent && (
                            <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {stat.title}
                        </p>
                      </motion.div>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {statValue.value}
                        </span>
                      </div>

                      <motion.div
                        className="flex items-center gap-1 group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span className="text-xs font-medium text-[#64ab6f] dark:text-[#64ab6f] group-hover:text-[#64ab6f] dark:group-hover:text-[#64ab6f] transition-colors">
                          Add
                        </span>
                        <Icons.Plus className="w-3 h-3 text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors" />
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
          <p className="text-gray-600 dark:text-gray-400">
            All stats are currently displayed on the dashboard.
          </p>
        </div>
      )}
    </motion.div>
  );
} 