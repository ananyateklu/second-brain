export const LevelThresholds = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700
];

export interface XPProgress {
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

export function calculateXPProgress(experiencePoints: number, level: number): XPProgress {
  const currentLevelThreshold = LevelThresholds[level - 1] || 0;
  const nextLevelThreshold = LevelThresholds[level] || LevelThresholds[level - 1] + 100;
  
  const xpInCurrentLevel = experiencePoints - currentLevelThreshold;
  const xpNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
  const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  return {
    currentLevelXP: xpInCurrentLevel,
    nextLevelXP: xpNeededForNextLevel,
    progress: Math.min(100, Math.max(0, progress))
  };
} 