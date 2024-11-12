import React, { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
    User,
    Mail,
    Calendar,
    Trophy,
    Star,
    TrendingUp,
    Award,
    Target,
    BarChart2,
    CheckCheck,
    Clock,
    Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ExperienceBar } from './ExperienceBar';

export function PersonalPage() {
    const { user } = useAuth();


    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    // Calculate join date
    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Add level thresholds constant
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

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white/95 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/30 shadow-md hover:shadow-lg transition-shadow rounded-xl p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-24 h-24 rounded-full border-2 border-white dark:border-gray-700/30 shadow-md"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-primary-500 dark:bg-primary-900 text-white dark:text-primary-100 rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg">
                            Level {user.level}
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                        <div className="flex flex-col md:flex-row gap-4 mt-2 text-gray-600 dark:text-gray-400">
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

            {/* Level Progress */}
            <div className="bg-white/95 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/30 shadow-md hover:shadow-lg transition-shadow rounded-xl p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Level Progress
                            </h2>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Level {user.level}
                        </div>
                    </div>

                    <ExperienceBar
                        currentXP={user.experiencePoints - (LevelThresholds[user.level - 1] || 0)}
                        nextLevelXP={LevelThresholds[user.level] - LevelThresholds[user.level - 1]}
                        progress={user.levelProgress}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { icon: Trophy, label: 'Achievements', value: user.achievementCount, color: 'amber' },
                    { icon: Star, label: 'Total XP', value: user.experiencePoints, color: 'blue' },
                    { icon: Award, label: 'Current Level', value: user.level, color: 'green' },
                    { icon: CheckCheck, label: 'XP from Achievements', value: user.totalXPFromAchievements, color: 'red' },
                    { icon: Target, label: 'Next Level', value: user.xpForNextLevel, color: 'purple' }
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white/95 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/30 shadow-md hover:shadow-lg transition-shadow rounded-xl p-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30 shadow-sm`}>
                                <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {stat.value.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Account Details */}
            <div className="bg-white/95 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/30 shadow-md hover:shadow-lg transition-shadow rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-sm">
                        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Account Details
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/40 shadow-sm">
                                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Username</div>
                                <div className="text-gray-900 dark:text-white">{user.name}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/40 shadow-sm">
                                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
                                <div className="text-gray-900 dark:text-white">{user.email}</div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/40 shadow-sm">
                                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Member Since</div>
                                <div className="text-gray-900 dark:text-white">{joinDate}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/40 shadow-sm">
                                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Account Status</div>
                                <div className="text-green-500">Active</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 