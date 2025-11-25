import { useThemeStore } from '../../store/theme-store';
import { useSettingsStore } from '../../store/settings-store';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export function GeneralSettings() {
    const { theme, setTheme } = useThemeStore();
    const {
        defaultNoteView,
        itemsPerPage,
        enableNotifications,
        autoSaveInterval,
        fontSize,
        setDefaultNoteView,
        setItemsPerPage,
        setEnableNotifications,
        setAutoSaveInterval,
        setFontSize,
    } = useSettingsStore();

    const getThemeName = () => {
        switch (theme) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            case 'blue':
                return 'Blue';
            default:
                return 'Light';
        }
    };

    const getThemeIcon = (themeOption: 'light' | 'dark' | 'blue') => {
        switch (themeOption) {
            case 'light':
                return (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                );
            case 'dark':
                return (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                );
            case 'blue':
                return (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                );
        }
    };

    const getViewIcon = (view: 'list' | 'grid') => {
        if (view === 'list') {
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            );
        }
        return (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        );
    };

    return (
        <div className="space-y-6">
            {/* Appearance and Display Options - Inline */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Theme Preferences Section */}
                <section
                    className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                }}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                            </div>
                        <div>
                            <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                                Appearance
                            </span>
                            <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                                Theme preferences
                            </h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Customize the visual appearance and color scheme
                            </p>
                            </div>
                        </div>
                        <span
                            className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                            style={{
                                border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                color: 'var(--color-brand-600)',
                            }}
                        >
                            {getThemeIcon(theme)}
                            {getThemeName()} mode
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </div>
                            <div>
                                    <label className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
                                    Quick Toggle
                                </label>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        Cycle through themes quickly
                                </p>
                                </div>
                            </div>
                            <ThemeToggle />
                        </div>

                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <label className="text-sm font-medium mb-4 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Select Theme
                            </label>
                            <div className="grid gap-3 grid-cols-3">
                                {(['light', 'dark', 'blue'] as const).map((themeOption) => {
                                    const isActive = theme === themeOption;
                                    return (
                                        <button
                                            key={themeOption}
                                            type="button"
                                            onClick={() => setTheme(themeOption)}
                                            className="w-full text-center rounded-2xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-1"
                                            style={{
                                                backgroundColor: isActive
                                                    ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                    : 'var(--surface-elevated)',
                                                borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                                color: 'var(--text-primary)',
                                                boxShadow: isActive
                                                    ? '0 18px 35px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                                                    : 'none',
                                                transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                    e.currentTarget.style.boxShadow = '0 8px 16px color-mix(in srgb, var(--color-brand-900) 15%, transparent)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                    e.currentTarget.style.borderColor = 'var(--border)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? 'color-mix(in srgb, var(--color-brand-600) 25%, transparent)'
                                                            : 'var(--surface-card)',
                                                        color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {getThemeIcon(themeOption)}
                                                </div>
                                                <div className="text-sm font-semibold capitalize">{themeOption}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* General Preferences Section */}
                <section
                    className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                }}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        <div>
                            <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                                Display Options
                            </span>
                            <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                                General preferences
                            </h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Configure app behavior and display settings
                            </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Default Note View */}
                        <div>
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                Default Note View
                            </label>
                            <div className="grid gap-3 grid-cols-2">
                                {(['list', 'grid'] as const).map((view) => {
                                    const isActive = defaultNoteView === view;
                                    return (
                                        <button
                                            key={view}
                                            type="button"
                                            onClick={() => setDefaultNoteView(view)}
                                            className="w-full text-center rounded-2xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-1"
                                            style={{
                                                backgroundColor: isActive
                                                    ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                    : 'var(--surface-elevated)',
                                                borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                                color: 'var(--text-primary)',
                                                boxShadow: isActive
                                                    ? '0 18px 35px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                                                    : 'none',
                                                transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                    e.currentTarget.style.boxShadow = '0 8px 16px color-mix(in srgb, var(--color-brand-900) 15%, transparent)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                    e.currentTarget.style.borderColor = 'var(--border)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? 'color-mix(in srgb, var(--color-brand-600) 25%, transparent)'
                                                            : 'var(--surface-card)',
                                                        color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {getViewIcon(view)}
                                                </div>
                                                <div className="text-sm font-semibold capitalize">{view}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Items Per Page */}
                        <div>
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                Items Per Page
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[10, 20, 50, 100].map((count) => {
                                    const isActive = itemsPerPage === count;
                                    return (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setItemsPerPage(count)}
                                            className="px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5"
                                            style={{
                                                backgroundColor: isActive
                                                    ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                    : 'var(--surface-elevated)',
                                                borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                                color: isActive ? 'var(--color-brand-600)' : 'var(--text-primary)',
                                                boxShadow: isActive
                                                    ? '0 8px 20px color-mix(in srgb, var(--color-brand-900) 25%, transparent)'
                                                    : 'none',
                                                transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 12%, transparent)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                    e.currentTarget.style.borderColor = 'var(--border)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            {count}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="flex items-center justify-between pt-4 border-t p-4 rounded-xl" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                            <div>
                                    <label className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
                                    Enable Notifications
                                </label>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    Receive notifications for important updates
                                </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEnableNotifications(!enableNotifications)}
                                className="relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:scale-105 active:scale-95"
                                style={{
                                    backgroundColor: enableNotifications ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--border) 60%, transparent)',
                                    boxShadow: enableNotifications
                                        ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)'
                                        : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (enableNotifications) {
                                        e.currentTarget.style.backgroundColor = 'var(--color-brand-700)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--color-brand-600) 40%, transparent)';
                                    } else {
                                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--border) 80%, var(--color-brand-400))';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = enableNotifications ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--border) 60%, transparent)';
                                    e.currentTarget.style.boxShadow = enableNotifications
                                        ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)'
                                        : 'none';
                                }}
                            >
                                <span
                                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md"
                                    style={{
                                        transform: enableNotifications ? 'translateX(1.625rem)' : 'translateX(0.25rem)',
                                    }}
                                />
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Additional Settings Row - Half Height */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Editor Preferences Section */}
                <section
                    className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex items-start gap-3 mb-6">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                            }}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                        <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                            Editor
                        </span>
                        <h3 className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            Preferences
                        </h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Configure auto-save behavior
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Auto-save Interval
                        </label>
                        <div className="flex gap-2">
                            {[1000, 2000, 5000].map((interval) => {
                                const isActive = autoSaveInterval === interval;
                                return (
                                    <button
                                        key={interval}
                                        type="button"
                                        onClick={() => setAutoSaveInterval(interval)}
                                        className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: isActive
                                                ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                : 'var(--surface-elevated)',
                                            borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                            color: isActive ? 'var(--color-brand-600)' : 'var(--text-primary)',
                                            boxShadow: isActive
                                                ? '0 4px 12px color-mix(in srgb, var(--color-brand-900) 20%, transparent)'
                                                : 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 12%, transparent)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {interval / 1000}s
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Accessibility Section */}
                <section
                    className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex items-start gap-3 mb-6">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                            }}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                        <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                            System
                        </span>
                        <h3 className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                            Accessibility
                        </h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Adjust text size for readability
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Font Size
                        </label>
                        <div className="flex gap-2">
                            {(['small', 'medium', 'large'] as const).map((size) => {
                                const isActive = fontSize === size;
                                return (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setFontSize(size)}
                                        className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: isActive
                                                ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                : 'var(--surface-elevated)',
                                            borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                            color: isActive ? 'var(--color-brand-600)' : 'var(--text-primary)',
                                            boxShadow: isActive
                                                ? '0 4px 12px color-mix(in srgb, var(--color-brand-900) 20%, transparent)'
                                                : 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 12%, transparent)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {size}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

