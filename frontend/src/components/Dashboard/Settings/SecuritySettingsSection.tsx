import {
    Shield, Timer, CheckCircle, ChevronDown,
    Lock, Eye, EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';

export function SecuritySettingsSection() {
    const { theme } = useTheme();
    const [sessionTimeout, setSessionTimeout] = useState("30 minutes");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Toggle states
    const [showPassword, setShowPassword] = useState(false);

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };


    const primaryButtonClasses = `
    flex items-center gap-1.5 px-3 py-1.5 shrink-0
    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
    text-white rounded-lg transition-all duration-200 
    hover:scale-105
    shadow-sm
    text-xs font-medium
  `;

    const handleDropdownClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleTimeoutSelect = (value: string) => {
        setSessionTimeout(value);
        setIsDropdownOpen(false);
    };

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--color-text)]">Security & Privacy</h4>
            </div>

            {/* Main security settings card */}
            <motion.div
                variants={cardVariants}
                className={`space-y-4 p-4 ${getContainerBackground()} rounded-lg border-[0.5px] border-white/10`}
            >
                {/* Authentication & Session Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Two-Factor Authentication */}
                    <div className={`p-3 rounded-lg ${getContainerBackground()} border-[0.5px] border-white/10`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--color-accent)]/10">
                                    <Shield className="w-3 h-3 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-xs text-[var(--color-text)]">Two-Factor Authentication</p>
                                    <p className="text-[9px] text-[var(--color-textSecondary)]">
                                        Add an extra layer of security
                                    </p>
                                </div>
                            </div>
                            <button className={primaryButtonClasses}>
                                Enable
                            </button>
                        </div>
                    </div>

                    {/* Session Timeout */}
                    <div className={`p-3 rounded-lg ${getContainerBackground()} border-[0.5px] border-white/10`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--color-accent)]/10">
                                    <Timer className="w-3 h-3 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-xs text-[var(--color-text)]">Session Timeout</p>
                                    <p className="text-[9px] text-[var(--color-textSecondary)]">
                                        Auto-logout after inactivity
                                    </p>
                                </div>
                            </div>

                            {/* Dropdown for session timeout */}
                            <div className="relative">
                                <button
                                    onClick={handleDropdownClick}
                                    className={`
                                        flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg
                                        ${getContainerBackground()}
                                        border-[0.5px] border-white/10
                                        text-xs text-[var(--color-text)]
                                        hover:bg-[var(--color-surfaceHover)]
                                        min-w-[100px]
                                    `}
                                >
                                    <span>{sessionTimeout}</span>
                                    <ChevronDown
                                        className={`
                                            w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-[var(--color-textSecondary)]
                                            ${isDropdownOpen ? 'transform rotate-180' : ''}
                                        `}
                                    />
                                </button>

                                {isDropdownOpen && (
                                    <div
                                        className={`
                                            absolute z-10 mt-1 w-full
                                            bg-[#1e293b] dark:bg-[#1e293b] rounded-lg
                                            border-[0.5px] border-white/10
                                            shadow-lg
                                            overflow-hidden
                                        `}
                                    >
                                        {["30 minutes", "1 hour", "4 hours", "Never"].map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => handleTimeoutSelect(option)}
                                                className={`
                                                    w-full px-2 py-1.5 text-left text-xs
                                                    ${sessionTimeout === option
                                                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                                        : 'text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]'
                                                    }
                                                    flex items-center justify-between
                                                `}
                                            >
                                                <span>{option}</span>
                                                {sessionTimeout === option && (
                                                    <CheckCircle className="w-3 h-3 shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Management Section */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <h5 className="text-xs font-medium text-[var(--color-text)] mb-3">Password Management</h5>

                    <div className={`p-3 rounded-lg ${getContainerBackground()} border-[0.5px] border-white/10`}>
                        <div className="flex flex-col space-y-3">
                            {/* Current password field */}
                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-[var(--color-textSecondary)]">Current Password</label>
                                <div className="flex items-center">
                                    <div className="flex items-center w-full relative">
                                        <div className="absolute left-2">
                                            <Lock className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className={`
                                                w-full pl-8 pr-8 py-1.5 rounded-lg
                                                ${getContainerBackground()}
                                                border-[0.5px] border-white/10
                                                text-xs text-[var(--color-text)]
                                                focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20
                                            `}
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            className="absolute right-2"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                            ) : (
                                                <Eye className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* New password field */}
                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-[var(--color-textSecondary)]">New Password</label>
                                <div className="flex items-center w-full relative">
                                    <div className="absolute left-2">
                                        <Lock className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className={`
                                            w-full pl-8 pr-8 py-1.5 rounded-lg
                                            ${getContainerBackground()}
                                            border-[0.5px] border-white/10
                                            text-xs text-[var(--color-text)]
                                            focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20
                                        `}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        className="absolute right-2"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                        ) : (
                                            <Eye className="w-3 h-3 text-[var(--color-textSecondary)]" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Password requirements */}
                            <div className="space-y-1">
                                <p className="text-[9px] text-[var(--color-textSecondary)]">Password must:</p>
                                <ul className="text-[9px] text-[var(--color-textSecondary)] space-y-0.5 pl-3">
                                    <li className="flex items-center gap-1">
                                        <CheckCircle className="w-2 h-2 text-green-500" />
                                        <span>Be at least 8 characters long</span>
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <CheckCircle className="w-2 h-2 text-green-500" />
                                        <span>Include at least one uppercase letter</span>
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <CheckCircle className="w-2 h-2 text-green-500" />
                                        <span>Include at least one number</span>
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <CheckCircle className="w-2 h-2 text-green-500" />
                                        <span>Include at least one special character</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Change password button */}
                            <div className="flex justify-end pt-1">
                                <button className={primaryButtonClasses}>
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer message */}
                <div className="flex items-center border-t border-white/10 pt-3 mt-2">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[var(--color-accent)]" />
                        <span className="text-xs text-[var(--color-textSecondary)]">
                            These settings control the security and privacy of your Second Brain account.
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
} 