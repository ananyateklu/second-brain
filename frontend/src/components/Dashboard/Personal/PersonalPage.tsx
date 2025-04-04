import { useAuth } from '../../../hooks/useAuth';
import {
    User,
    Mail,
    Calendar,
    Trophy,
    Star,
    TrendingUp,
    Award,
    Target,
    CheckCheck,
    Clock,
    Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { ExperienceBar } from './ExperienceBar';
import { XPBreakdownCard } from './XPBreakdownCard';

export function PersonalPage() {
    const { user } = useAuth();
    const { theme } = useTheme();

    const joinDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'N/A';

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

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const cardClasses = `
        relative 
        overflow-hidden 
        rounded-2xl 
        ${getContainerBackground()}
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
        transition-all 
        duration-300
        hover:bg-[var(--color-surfaceHover)]
    `;

    // Create a version without hover effect for XP Breakdown Card
    const cardClassesNoHover = `
        relative 
        overflow-hidden 
        rounded-2xl 
        ${getContainerBackground()}
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
    `;

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="min-h-screen overflow-visible bg-fixed">
            {/* Background */}
            <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

            <div className="space-y-8 relative w-full">
                {/* Profile Header */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className={cardClasses}
                >
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="relative">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-24 h-24 rounded-full border-[0.5px] border-white/10 shadow-md"
                                />
                                <div className="absolute -bottom-2 -right-2 bg-[var(--color-accent)] text-white rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg">
                                    Level {user.level}
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-[var(--color-text)]">{user.name}</h1>
                                <div className="flex flex-col md:flex-row gap-4 mt-2 text-[var(--color-textSecondary)]">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>Joined {joinDate}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Level Progress */}
                <motion.div
                    variants={cardVariants}
                    className={cardClasses}
                >
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-white/10">
                                    <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--color-text)]">Level Progress</h2>
                                    <p className="text-sm text-[var(--color-textSecondary)]">Track your journey</p>
                                </div>
                            </div>
                            <div className="text-sm text-[var(--color-textSecondary)]">
                                Level {user.level}
                            </div>
                        </div>

                        <ExperienceBar
                            currentXP={user.experiencePoints - (LevelThresholds[user.level - 1] || 0)}
                            nextLevelXP={LevelThresholds[user.level] - LevelThresholds[user.level - 1]}
                            progress={user.levelProgress}
                        />
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { icon: Trophy, label: 'Achievements', value: user.achievementCount, color: 'amber' },
                        { icon: Star, label: 'Total XP', value: user.experiencePoints, color: 'blue' },
                        { icon: Award, label: 'Current Level', value: user.level, color: 'green' },
                        { icon: CheckCheck, label: 'XP from Achievements', value: user.totalXPFromAchievements, color: 'red' },
                        { icon: Target, label: 'Next Level', value: user.xpForNextLevel, color: 'purple' }
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: index * 0.1 }}
                            className={cardClasses}
                        >
                            <div className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                                        <stat.icon className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--color-textSecondary)]">{stat.label}</div>
                                        <div className="text-lg font-semibold text-[var(--color-text)]">
                                            {stat.value.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Account Details */}
                <motion.div
                    variants={cardVariants}
                    className={cardClasses}
                >
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-white/10">
                                <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-text)]">Account Details</h2>
                                <p className="text-sm text-[var(--color-textSecondary)]">Your account information</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                                        <User className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--color-textSecondary)]">Username</div>
                                        <div className="text-[var(--color-text)]">{user.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                                        <Mail className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--color-textSecondary)]">Email</div>
                                        <div className="text-[var(--color-text)]">{user.email}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                                        <Calendar className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--color-textSecondary)]">Member Since</div>
                                        <div className="text-[var(--color-text)]">{joinDate}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                                        <Clock className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--color-textSecondary)]">Account Status</div>
                                        <div className="text-[var(--color-accent)]">Active</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* XP Breakdown Section */}
                <XPBreakdownCard cardClasses={cardClassesNoHover} />
            </div>
        </div>
    );
} 