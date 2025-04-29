import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { ThemeName } from '../../../theme/theme.config';

export function AppearanceSettingsSection() {
    const { theme, setTheme } = useTheme();

    const handleThemeChange = (newTheme: ThemeName) => {
        setTheme(newTheme);
    };

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

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Appearance</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Choose how Second Brain looks to you</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Light Theme */}
                <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'light' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                <Sun className="w-4 h-4 text-[var(--color-accent)]" />
                            </div>
                            <span className="font-medium text-[var(--color-text)]">Light</span>
                        </div>
                        <input
                            type="radio"
                            name="theme"
                            checked={theme === 'light'}
                            onChange={() => handleThemeChange('light')}
                            className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
                        />
                    </div>
                    <div className="h-32 w-full rounded-lg bg-gray-50 border border-gray-200"></div>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-3">Clean and bright appearance for daytime use</p>
                </label>

                {/* Dark Theme */}
                <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'dark' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                <Moon className="w-4 h-4 text-[var(--color-accent)]" />
                            </div>
                            <span className="font-medium text-[var(--color-text)]">Dark</span>
                        </div>
                        <input
                            type="radio"
                            name="theme"
                            checked={theme === 'dark'}
                            onChange={() => handleThemeChange('dark')}
                            className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
                        />
                    </div>
                    <div className="h-32 w-full rounded-lg bg-gray-800 border border-gray-700"></div>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-3">Easy on the eyes in low-light environments</p>
                </label>

                {/* Midnight Theme */}
                <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'midnight' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                            </div>
                            <span className="font-medium text-[var(--color-text)]">Midnight</span>
                        </div>
                        <input
                            type="radio"
                            name="theme"
                            checked={theme === 'midnight'}
                            onChange={() => handleThemeChange('midnight')}
                            className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
                        />
                    </div>
                    <div className="h-32 w-full rounded-lg bg-[#0f172a] border border-[#1e293b]"></div>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-3">Deep dark experience for nighttime focus</p>
                </label>
            </div>
        </div>
    );
} 