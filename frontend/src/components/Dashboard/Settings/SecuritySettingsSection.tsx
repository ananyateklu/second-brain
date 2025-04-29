import {
    Shield, Timer, BarChart2, KeyRound, History, Link2
} from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

export function SecuritySettingsSection() {
    const { theme } = useTheme();

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const innerElementClasses = `
    ${getContainerBackground()}
    border-[0.5px] 
    border-white/10
    backdrop-blur-xl
    rounded-xl
    transition-all
    duration-200
    hover:bg-[var(--color-surfaceHover)]
  `;

    const toggleClasses = `
    w-14 
    h-7 
    bg-gray-400/50
    dark:bg-gray-700/30
    rounded-full 
    peer 
    peer-checked:after:translate-x-full 
    after:content-[''] 
    after:absolute 
    after:top-[2px] 
    after:left-[2px] 
    after:bottom-[2px]
    after:bg-white
    dark:after:bg-gray-200
    after:rounded-full 
    after:w-6 
    after:transition-all 
    after:shadow-sm
    peer-checked:bg-[var(--color-accent)]
    peer-checked:border-[var(--color-accent)]
    border-[0.5px]
    border-white/10
    transition-all
    duration-300
    backdrop-blur-sm
    hover:bg-gray-500/50
    dark:hover:border-gray-500/40
    peer-checked:hover:bg-[var(--color-accent)]/90
    peer-checked:hover:border-[var(--color-accent)]/90
  `;

    const primaryButtonClasses = `
    flex items-center gap-2 px-4 py-2
    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
    text-white rounded-lg transition-all duration-200 
    hover:scale-105 hover:-translate-y-0.5 
    shadow-sm hover:shadow-md
    text-sm font-medium
  `;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Security & Privacy</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Control your security and privacy settings</p>

            <div className="space-y-4 mt-6">
                <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                            <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <p className="font-medium text-[var(--color-text)]">Two-Factor Authentication</p>
                            <p className="text-xs text-[var(--color-textSecondary)]">
                                Add an extra layer of security to your account
                            </p>
                        </div>
                    </div>
                    <button className={primaryButtonClasses}>
                        Enable
                    </button>
                </div>

                <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                            <Timer className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <p className="font-medium text-[var(--color-text)]">Session Timeout</p>
                            <p className="text-xs text-[var(--color-textSecondary)]">
                                Auto-logout after inactivity
                            </p>
                        </div>
                    </div>
                    <select
                        className={`
              px-3 py-2 rounded-lg text-sm
              ${getContainerBackground()}
              border-[0.5px] border-white/10
              text-[var(--color-text)]
              hover:bg-[var(--color-surfaceHover)]
              transition-all duration-200
            `}
                    >
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                        <option>Never</option>
                    </select>
                </div>

                <div className="pt-6 border-t border-white/10">
                    <h4 className="font-medium text-[var(--color-text)] mb-4">Privacy Preferences</h4>

                    <div className="space-y-3">
                        <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                    <BarChart2 className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--color-text)]">Usage Analytics</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        Help improve Second Brain by sharing anonymous usage data
                                    </p>
                                </div>
                            </div>
                            <div className="relative inline-flex">
                                <input
                                    type="checkbox"
                                    checked={true} // Example: Should be driven by state
                                    onChange={() => { }} // Example: Should update state
                                    className="sr-only peer"
                                />
                                <div className={toggleClasses}></div>
                            </div>
                        </label>

                        <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                    <KeyRound className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--color-text)]">End-to-End Encryption</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        Encrypt your notes with a personal key
                                    </p>
                                </div>
                            </div>
                            <div className="relative inline-flex">
                                <input
                                    type="checkbox"
                                    checked={false} // Example: Should be driven by state
                                    onChange={() => { }} // Example: Should update state
                                    className="sr-only peer"
                                />
                                <div className={toggleClasses}></div>
                            </div>
                        </label>

                        <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                    <History className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--color-text)]">Activity History</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        Save your note editing history
                                    </p>
                                </div>
                            </div>
                            <div className="relative inline-flex">
                                <input
                                    type="checkbox"
                                    checked={true} // Example: Should be driven by state
                                    onChange={() => { }} // Example: Should update state
                                    className="sr-only peer"
                                />
                                <div className={toggleClasses}></div>
                            </div>
                        </label>

                        <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                    <Link2 className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--color-text)]">Link Previews</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        Generate previews for external links
                                    </p>
                                </div>
                            </div>
                            <div className="relative inline-flex">
                                <input
                                    type="checkbox"
                                    checked={true} // Example: Should be driven by state
                                    onChange={() => { }} // Example: Should update state
                                    className="sr-only peer"
                                />
                                <div className={toggleClasses}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
} 