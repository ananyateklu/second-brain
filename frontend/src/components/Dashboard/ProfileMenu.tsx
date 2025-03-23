import { User as UserIcon, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/themeContextUtils';
import type { User } from '../../types/auth';

interface ProfileMenuProps {
    user: User | null;
    logout: () => void;
    onClose: () => void;
}

export function ProfileMenu({ user, logout, onClose }: ProfileMenuProps) {
    const { theme } = useTheme();
    const navigate = useNavigate();

    // Calculate XP values
    const calculateXPProgress = (user: User | null) => {
        if (!user) return { currentLevelXP: 0, nextLevelXP: 100, progress: 0 };

        const LevelThresholds = [
            0,      // Level 1: 0-99
            100,    // Level 2: 100-249
            250,    // Level 3: 250-449
            450,    // Level 4: 450-699
            700,    // Level 5: 700-999
            1000,   // Level 6: 1000-1349
            1350,   // Level 7: 1350-1749
            1750,   // Level 8: 1750-2199
            2200,   // Level 9: 2200-2699
            2700    // Level 10: 2700+
        ];

        const currentLevelThreshold = LevelThresholds[user.level - 1] || 0;
        const nextLevelThreshold = LevelThresholds[user.level] || LevelThresholds[user.level - 1] + 100;

        const xpInCurrentLevel = user.experiencePoints - currentLevelThreshold;
        const xpNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
        const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

        return {
            currentLevelXP: xpInCurrentLevel,
            nextLevelXP: xpNeededForNextLevel,
            progress: Math.min(100, Math.max(0, progress))
        };
    };

    const xpProgress = calculateXPProgress(user);

    const getHoverClass = () => {
        switch (theme) {
            case 'midnight':
                return 'hover:bg-[var(--color-secondary)]/50';
            case 'dark':
                return 'hover:bg-[var(--color-secondary)]/30';
            default:
                return 'hover:bg-[var(--color-secondary)]/10';
        }
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-[var(--color-surface)]';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 top-[80px] w-64 rounded-lg 
                ${getContainerBackground()} 
                backdrop-blur-xl 
                border-[0.5px] border-white/10
                shadow-[0_4px_24px_-2px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.08)]
                dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.3),0_8px_16px_-4px_rgba(0,0,0,0.2)]
                ring-1 ring-white/5 
                transition-colors duration-200 z-50`}
        >
            <div className={`px-4 py-3 border-b-[0.5px] border-white/10 transition-colors duration-200`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)]/50 flex items-center justify-center overflow-hidden transition-colors duration-200">
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserIcon className="w-6 h-6 text-[var(--color-accent)] transition-colors duration-200" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[var(--color-text)] transition-colors duration-200">
                            {user?.name}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)] transition-colors duration-200">
                            {user?.email}
                        </p>
                    </div>
                </div>
                <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--color-textSecondary)] transition-colors duration-200">
                            Level {user?.level ?? 1}
                        </span>
                        <span className="text-[var(--color-textSecondary)] transition-colors duration-200">
                            {xpProgress.currentLevelXP.toLocaleString()} / {xpProgress.nextLevelXP.toLocaleString()} XP
                        </span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-secondary)]/50 rounded-full overflow-hidden transition-colors duration-200">
                        <motion.div
                            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpProgress.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-textSecondary)] text-right transition-colors duration-200">
                        {Math.round(xpProgress.progress)}% to Level {(user?.level ?? 1) + 1}
                    </div>
                </div>
            </div>

            <div className="py-1">
                <button
                    onClick={() => {
                        navigate('/dashboard/profile');
                        onClose();
                    }}
                    className={`w-full px-4 py-2 text-left text-sm text-[var(--color-text)] ${getHoverClass()} transition-colors duration-200 flex items-center gap-2`}
                >
                    <UserIcon className="w-4 h-4" />
                    View Profile
                </button>
                <button
                    onClick={() => {
                        navigate('/dashboard/settings');
                        onClose();
                    }}
                    className={`w-full px-4 py-2 text-left text-sm text-[var(--color-text)] ${getHoverClass()} transition-colors duration-200 flex items-center gap-2`}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                <button
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className={`w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 midnight:hover:bg-red-500/10 flex items-center gap-2 transition-colors duration-200`}
                >
                    <LogOut className="w-4 h-4" />
                    Log out
                </button>
            </div>
        </motion.div>
    );
} 