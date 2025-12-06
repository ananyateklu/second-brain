import { useSettingsStore } from '../../store/settings-store';
import { toast } from '../../hooks/use-toast';

export function GeneralSettings() {
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
            {/* Developer and Display Options - Inline */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Developer Section - Notification Testing */}
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                                Developer
                            </span>
                            <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                                Notification Testing
                            </h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Test different notification styles and behaviors
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Basic Notification Types */}
                        <div>
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Notification Types
                            </label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => toast.success('Success!', 'Your action was completed successfully.')}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))',
                                        borderColor: 'var(--color-brand-600)',
                                        color: 'var(--color-brand-500)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Success
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toast.error('Error!', 'Something went wrong. Please try again.')}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, var(--surface-elevated))',
                                        borderColor: 'var(--color-error)',
                                        color: 'var(--color-error-text-light)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Error
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toast.warning('Warning!', 'Please review this before proceeding.')}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, #f59e0b 12%, var(--surface-elevated))',
                                        borderColor: '#f59e0b',
                                        color: '#fbbf24',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Warning
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toast.info('Information', 'Here is some helpful information for you.')}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 12%, var(--surface-elevated))',
                                        borderColor: 'var(--color-accent-blue)',
                                        color: 'var(--color-accent-blue)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Info
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Advanced Features */}
                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Advanced Features
                            </label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const loadingId = toast.loading('Loading...');
                                        setTimeout(() => {
                                            if (loadingId) {
                                                toast.dismiss(loadingId);
                                                toast.success('Loaded!', 'The operation completed.');
                                            }
                                        }, 2000);
                                    }}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'var(--surface-elevated)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Loading → Success
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const mockPromise = new Promise<string>((resolve) => {
                                            setTimeout(() => { resolve('Data loaded!'); }, 2500);
                                        });
                                        void toast.promise(mockPromise, {
                                            loading: 'Fetching data...',
                                            success: (data) => data,
                                            error: 'Failed to fetch data',
                                        });
                                    }}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'var(--surface-elevated)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        Promise Toast
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        toast.success('Action Required', 'Click the button to proceed.', {
                                            action: {
                                                label: 'Take Action',
                                                onClick: () => toast.info('Action taken!'),
                                            },
                                            duration: 10000,
                                        });
                                    }}
                                    className="px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                    style={{
                                        backgroundColor: 'var(--surface-elevated)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                        </svg>
                                        With Action
                                    </div>
                                </button>
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
                                            onClick={() => { setDefaultNoteView(view); }}
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
                                            onClick={() => { setItemsPerPage(count); }}
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
                                onClick={() => { setEnableNotifications(!enableNotifications); }}
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
                                        onClick={() => { setAutoSaveInterval(interval); }}
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
                                        onClick={() => { setFontSize(size); }}
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

