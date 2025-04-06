import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { calculateXPProgress } from '../../../utils/xpCalculations';
import { AuthState } from '../../../types/auth'; // Import AuthState

// Use the user type defined within AuthState, ensuring it's not null
type UserPropType = NonNullable<AuthState['user']>;

interface LevelProgressSectionProps {
    user: UserPropType;
}

export function LevelProgressSection({ user }: LevelProgressSectionProps) {
    // Ensure user is not null before accessing properties (though type guard helps)
    if (!user) return null;

    const { currentLevelXP, nextLevelXP, progress } = calculateXPProgress(user.experiencePoints, user.level);

    return (
        <motion.div
            // variants={cardVariants} // Assuming cardVariants is available or defined elsewhere
            className="relative overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 backdrop-blur-xl border-[0.5px] border-white/10 shadow-md dark:shadow-lg ring-1 ring-white/5"
        >
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[var(--color-accent)]/10 rounded-md backdrop-blur-sm border-[0.5px] border-white/10">
                            <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text)]">Level Progress</h2>
                        </div>
                    </div>
                    <div className="text-sm text-[var(--color-textSecondary)]">
                        Level {user.level}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[var(--color-textSecondary)]">
                        <span>{currentLevelXP.toLocaleString()} XP This Level</span>
                        <span>{nextLevelXP.toLocaleString()} XP Needed for Level {user.level + 1}</span>
                    </div>
                    <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-[var(--color-accent)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <div className="text-right text-xs text-[var(--color-textSecondary)]">
                        {Math.round(progress)}% to next level
                    </div>
                </div>
            </div>
        </motion.div>
    );
} 