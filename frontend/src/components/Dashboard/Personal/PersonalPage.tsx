import { useAuth } from '../../../hooks/useAuth';
import {
    Mail,
    Calendar,
    Trophy,
    CheckCheck,
    CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { LevelProgressSection } from './LevelProgressSection';
import { XPBreakdownSection } from './XPBreakdownSection';
import { authService, XPBreakdownResponse } from '../../../services/api/auth.service';
import api from '../../../services/api/api';
import { useState, useEffect, useCallback } from 'react';

export function PersonalPage() {
    const { user, isLoading: authLoading, error: authError } = useAuth();
    const { theme } = useTheme();

    const [xpData, setXpData] = useState<XPBreakdownResponse | null>(null);
    const [xpLoading, setXpLoading] = useState(true);
    const [xpError, setXpError] = useState<string | null>(null);
    const [seedingXP, setSeedingXP] = useState(false);

    const fetchXPData = useCallback(async () => {
        try {
            setXpLoading(true);
            setXpError(null);
            const response = await authService.getXPBreakdown();
            setXpData(response);
        } catch (err) {
            console.error('Error fetching XP breakdown:', err);
            setXpError('Failed to load XP data');
        } finally {
            setXpLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchXPData();
        }
    }, [user, fetchXPData]);

    const handleSeedXPHistory = useCallback(async () => {
        try {
            setSeedingXP(true);
            setXpError(null);
            await api.post('/auth/me/seed-xp-history');
            // Refetch the data after seeding
            await fetchXPData();
        } catch (err) {
            console.error('Error seeding XP history:', err);
            setXpError('Failed to seed XP history data');
        } finally {
            setSeedingXP(false);
        }
    }, [fetchXPData]);

    const joinDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'N/A';

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const cardClasses = `
        relative
        overflow-hidden
        rounded-xl
        ${getContainerBackground()}
        backdrop-blur-xl
        border-[0.5px]
        border-white/10
        shadow-md dark:shadow-lg
        ring-1
        ring-white/5
        transition-all
        duration-300
        hover:bg-[var(--color-surfaceHover)]
    `;

    if (authLoading) {
        return <div>Loading User Data...</div>;
    }

    if (authError || !user) {
        return <div>Error loading user data. Please try again later.</div>;
    }

    return (
        <div className="min-h-screen overflow-visible bg-fixed">
            {/* Background */}
            <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

            <div className="space-y-5 relative w-full">
                {/* Profile Header - Updated Styling */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className={cardClasses}
                >
                    <div className="p-4 flex flex-row items-center justify-between gap-4">
                        <div className="flex flex-row items-center gap-4 flex-shrink-0">
                            <div className="relative flex-shrink-0">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-16 h-16 rounded-full border-[0.5px] border-white/10 shadow-md"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-[var(--color-accent)] text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow-lg">
                                    Level {user.level}
                                </div>
                            </div>
                            <div className="text-left">
                                <h1 className="text-xl font-bold text-[var(--color-text)]">{user.name}</h1>
                                <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[var(--color-textSecondary)]">
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Joined {joinDate}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-500 dark:text-green-400">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-x-6 text-right">
                            <div className="flex flex-col items-end">
                                <p className="text-xs text-[var(--color-textSecondary)] uppercase tracking-wider mb-0.5">Total XP</p>
                                <p className="text-lg font-semibold text-[var(--color-text)]">{user.experiencePoints.toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-xs text-[var(--color-textSecondary)] uppercase tracking-wider mb-0.5">Achievements</p>
                                <div className="flex items-center justify-end gap-1.5 text-[var(--color-text)]">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <span className="text-lg font-semibold">{user.achievementCount.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-xs text-[var(--color-textSecondary)] uppercase tracking-wider mb-0.5">Achievement XP</p>
                                <div className="flex items-center justify-end gap-1.5 text-[var(--color-text)]">
                                    <CheckCheck className="w-4 h-4 text-red-500" />
                                    <span className="text-lg font-semibold">{user.totalXPFromAchievements.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Level Progress Section */}
                <LevelProgressSection user={user} />

                {/* XP Breakdown Section */}
                <XPBreakdownSection
                    data={xpData}
                    loading={xpLoading}
                    error={xpError}
                    seedingXP={seedingXP}
                    onSeedXPHistory={handleSeedXPHistory}
                />
            </div>
        </div>
    );
} 