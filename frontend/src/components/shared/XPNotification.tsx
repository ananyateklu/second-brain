import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, ArrowUp } from 'lucide-react';

interface XPNotificationProps {
  xp: number;
  achievement?: {
    name: string;
    icon: string;
  };
  levelUp?: {
    newLevel: number;
  };
  onClose: () => void;
}

export function XPNotification({ xp, achievement, levelUp, onClose }: XPNotificationProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed bottom-4 right-4 bg-white dark:bg-dark-card shadow-lg rounded-lg p-4 max-w-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Star className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              +{xp} XP
            </p>
            {achievement && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Trophy className="w-4 h-4" />
                <span>Achievement: {achievement.name}</span>
              </div>
            )}
            {levelUp && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <ArrowUp className="w-4 h-4" />
                <span>Level Up! Now level {levelUp.newLevel}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 