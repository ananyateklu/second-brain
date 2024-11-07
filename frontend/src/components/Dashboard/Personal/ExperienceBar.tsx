import React from 'react';
import { motion } from 'framer-motion';

interface ExperienceBarProps {
  currentXP: number;
  nextLevelXP: number;
  progress: number;
}

export function ExperienceBar({ currentXP, nextLevelXP, progress }: ExperienceBarProps) {
  // Calculate progress percentage based on current and next level XP
  const calculatedProgress = Math.min(100, (currentXP / nextLevelXP) * 100);
  
  console.log('Progress Bar Values:', {
    currentXP,
    nextLevelXP,
    passedProgress: progress,
    calculatedProgress,
    normalizedProgress: calculatedProgress
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{currentXP.toLocaleString()} XP</span>
        <span>{nextLevelXP.toLocaleString()} XP needed</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary-500 dark:bg-primary-600"
          initial={{ width: 0 }}
          animate={{ width: `${calculatedProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="text-right text-sm text-gray-600 dark:text-gray-400">
        {Math.round(calculatedProgress)}% to next level
      </div>
    </div>
  );
} 