import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  xpValue: number;
  dateAchieved?: string;
  isUnlocked: boolean;
}

export function AchievementsList() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch('/api/achievements/me');
        const data = await response.json();
        setAchievements(data.achievements);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (isLoading) {
    return <div>Loading achievements...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className={`glass-morphism p-4 rounded-xl ${
              achievement.isUnlocked
                ? 'border-primary-200 dark:border-primary-800'
                : 'border-gray-200 dark:border-gray-700 opacity-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                achievement.isUnlocked
                  ? 'bg-primary-100 dark:bg-primary-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                {achievement.isUnlocked ? (
                  <div className="text-2xl">{achievement.icon}</div>
                ) : (
                  <Lock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {achievement.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {achievement.description}
                </p>
                {achievement.isUnlocked && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Trophy className="w-3 h-3" />
                    <span>Unlocked {new Date(achievement.dateAchieved!).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="mt-2 text-xs text-primary-600 dark:text-primary-400">
                  +{achievement.xpValue} XP
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 