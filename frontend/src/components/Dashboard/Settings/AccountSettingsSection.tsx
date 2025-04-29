import { User, Zap } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

export function AccountSettingsSection() {
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
            <h3 className="text-lg font-bold text-[var(--color-text)]">Account</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Manage your account information</p>

            <div className="space-y-4 mt-6">
                <div className={`p-5 ${innerElementClasses}`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getContainerBackground()} text-[var(--color-accent)]`}>
                            <User className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-[var(--color-text)]">John Doe</h4> {/* Placeholder: Replace with actual user data */}
                                <button className={`
                  px-3 py-1 rounded-lg text-xs
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  text-[var(--color-textSecondary)]
                  hover:bg-[var(--color-surfaceHover)]
                  transition-all duration-200
                `}>
                                    Edit
                                </button>
                            </div>
                            <p className="text-sm text-[var(--color-textSecondary)]">john.doe@example.com</p> {/* Placeholder: Replace with actual user data */}
                            <p className="text-xs text-[var(--color-textSecondary)] mt-2">Member since January 2023</p> {/* Placeholder: Replace with actual user data */}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                    <h4 className="font-medium text-[var(--color-text)] mb-4">Subscription</h4>

                    <div className={`p-5 ${innerElementClasses}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="font-semibold text-[var(--color-text)]">Free Plan</h5> {/* Placeholder: Replace with actual subscription data */}
                                <p className="text-sm text-[var(--color-textSecondary)]">Basic access to Second Brain features</p>
                            </div>
                            <button className={primaryButtonClasses}>
                                <Zap className="w-4 h-4" />
                                Upgrade
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-[var(--color-surface)]/50 border border-white/5">
                                <p className="text-xs text-[var(--color-textSecondary)]">Notes</p>
                                <p className="text-lg font-semibold text-[var(--color-text)]">50 / 100</p> {/* Placeholder: Replace with actual usage data */}
                                <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full mt-1 overflow-hidden">
                                    <div className="h-full w-1/2 bg-[var(--color-accent)] rounded-full"></div>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-[var(--color-surface)]/50 border border-white/5">
                                <p className="text-xs text-[var(--color-textSecondary)]">AI Credits</p>
                                <p className="text-lg font-semibold text-[var(--color-text)]">20 / 50</p> {/* Placeholder: Replace with actual usage data */}
                                <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full mt-1 overflow-hidden">
                                    <div className="h-full w-[40%] bg-[var(--color-accent)] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 