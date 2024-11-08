import React from 'react';
import * as Icons from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotes } from '../../contexts/NotesContext';
import { DashboardStat } from '../../types/dashboard';
import { motion, AnimatePresence } from 'framer-motion';

const getIconColor = (type: string) => {
  switch (type) {
    case 'notes':
      return 'text-blue-600 dark:text-blue-400';
    case 'tags':
      return 'text-primary-600 dark:text-primary-400';
    case 'time':
      return 'text-purple-600 dark:text-purple-400';
    case 'ideas':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getIconBg = (type: string) => {
  switch (type) {
    case 'notes':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'tags':
      return 'bg-primary-100 dark:bg-primary-900/30';
    case 'time':
      return 'bg-purple-100 dark:bg-purple-900/30';
    case 'ideas':
      return 'bg-amber-100 dark:bg-amber-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30';
  }
};

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
  const { notes } = useNotes();

  const unusedStats = availableStats.filter(stat => !stat.enabled);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="glass-morphism rounded-xl w-full"
    >
      <div className="p-4 border-b border-gray-200 dark:border-dark-border">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Icons.Gauge className="w-4 h-4" />
          Available Stats
        </h3>
      </div>

      {unusedStats.length > 0 ? (
        <div className="p-3 grid grid-cols-8 gap-2">
          <AnimatePresence mode="popLayout">
            {unusedStats.map((stat) => {
              const IconComponent = Icons[stat.icon as keyof typeof Icons];
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
                    className="w-full h-[100px] glass-morphism p-3 rounded-lg border border-gray-100 dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-400 transition-all"
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
                          <IconComponent className="w-4 h-4 ${getIconColor(stat.type)}" />
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
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
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