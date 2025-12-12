
import { toast } from '../../hooks/use-toast';
import { useSettingsStore } from '../../store/settings-store';
import type { FontSize, NoteView } from '../../store/types';

export function GeneralSettings() {
    const {
        fontSize,
        setFontSize,
        defaultNoteView,
        setDefaultNoteView,
        itemsPerPage,
        setItemsPerPage,
        autoSaveInterval,
        setAutoSaveInterval,
    } = useSettingsStore();

    const handleFontSizeChange = (size: FontSize) => {
        setFontSize(size);
        toast.success('Font Size Updated', `Font size set to ${size}.`);
    };

    const handleNoteViewChange = (view: NoteView) => {
        setDefaultNoteView(view);
        toast.success('Default View Updated', `Default note view set to ${view}.`);
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
    };

    const handleAutoSaveChange = (value: number) => {
        setAutoSaveInterval(value);
    };

    const formatAutoSaveInterval = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${ms / 1000}s`;
    };

    return (
        <div className="space-y-4">
            {/* Display Settings Section */}
            <section
                className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
                style={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                }}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                            }}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                    Appearance
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Display Settings
                                </h3>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Customize how content is displayed throughout the app
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Font Size Selection */}
                        <div>
                            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                Font Size
                            </label>
                            <div className="flex gap-2">
                                {(['small', 'medium', 'large'] as FontSize[]).map((size) => {
                                    const isActive = fontSize === size;
                                    const sizeLabels = { small: 'Small', medium: 'Medium', large: 'Large' };
                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => handleFontSizeChange(size)}
                                            className="px-4 py-2 rounded-2xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5"
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
                                        >
                                            {sizeLabels[size]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Default Note View */}
                        <div>
                            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Default Note View
                            </label>
                            <div className="flex gap-2">
                                {(['list', 'grid'] as NoteView[]).map((view) => {
                                    const isActive = defaultNoteView === view;
                                    return (
                                        <button
                                            key={view}
                                            type="button"
                                            onClick={() => handleNoteViewChange(view)}
                                            className="px-4 py-2 rounded-2xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5 flex items-center gap-2"
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
                                        >
                                            {view === 'list' ? (
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                            ) : (
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                </svg>
                                            )}
                                            {view === 'list' ? 'List' : 'Grid'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Items Per Page Slider */}
                        <div>
                            <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Items Per Page
                                <span
                                    className="ml-2 px-2 py-0.5 rounded-xl text-[10px] font-semibold"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                                        color: 'var(--color-brand-600)',
                                    }}
                                >
                                    {itemsPerPage}
                                </span>
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>5</span>
                                <input
                                    type="range"
                                    min={5}
                                    max={100}
                                    step={5}
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${((itemsPerPage - 5) / 95) * 100}%, var(--surface-elevated) ${((itemsPerPage - 5) / 95) * 100}%, var(--surface-elevated) 100%)`,
                                    }}
                                />
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Notifications Testing & Auto-save Section */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Developer Section - Notification Testing */}
                <section
                    className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                }}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                        Developer
                                    </span>
                                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        Notification Testing
                                    </h3>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Test different notification styles and behaviors
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Basic Notification Types */}
                            <div>
                                <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                    Notification Types
                                </label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toast.success('Success!', 'Your action was completed successfully.')}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))',
                                            borderColor: 'var(--color-brand-600)',
                                            color: 'var(--color-brand-500)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Success
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.error('Error!', 'Something went wrong. Please try again.')}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, var(--surface-elevated))',
                                            borderColor: 'var(--color-error)',
                                            color: 'var(--color-error-text-light)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Error
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.warning('Warning!', 'Please review this before proceeding.')}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'color-mix(in srgb, #f59e0b 12%, var(--surface-elevated))',
                                            borderColor: '#f59e0b',
                                            color: '#fbbf24',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Warning
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.info('Information', 'Here is some helpful information for you.')}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 12%, var(--surface-elevated))',
                                            borderColor: 'var(--color-accent-blue)',
                                            color: 'var(--color-accent-blue)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Info
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Features */}
                            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Advanced Features
                                </label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const loadingId = toast.loading('Testing toast...');
                                            setTimeout(() => {
                                                if (loadingId) {
                                                    toast.dismiss(loadingId);
                                                    toast.success('Loaded!', 'The operation completed.');
                                                }
                                            }, 2000);
                                        }}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'var(--surface-elevated)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span className="truncate">Loading → Success</span>
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
                                                success: (data: string) => data,
                                                error: 'Failed to fetch data',
                                            });
                                        }}
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'var(--surface-elevated)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span className="truncate">Promise Toast</span>
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
                                        className="px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
                                        style={{
                                            backgroundColor: 'var(--surface-elevated)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                            </svg>
                                            <span className="truncate">With Action</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Auto-save Interval */}
                <section
                    className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                }}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                        Editor
                                    </span>
                                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        Auto-save Interval
                                    </h3>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    How often to auto-save your drafts
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Interval
                                </label>
                                <span
                                    className="px-2 py-0.5 rounded-xl text-[10px] font-semibold"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                                        color: 'var(--color-brand-600)',
                                    }}
                                >
                                    {formatAutoSaveInterval(autoSaveInterval)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>0.5s</span>
                                <input
                                    type="range"
                                    min={500}
                                    max={10000}
                                    step={500}
                                    value={autoSaveInterval}
                                    onChange={(e) => handleAutoSaveChange(parseInt(e.target.value, 10))}
                                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer transition-all duration-200"
                                    style={{
                                        background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${((autoSaveInterval - 500) / 9500) * 100}%, color-mix(in srgb, var(--border) 50%, transparent) ${((autoSaveInterval - 500) / 9500) * 100}%, color-mix(in srgb, var(--border) 50%, transparent) 100%)`,
                                    }}
                                />
                                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>10s</span>
                            </div>
                            <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                                Lower values save more frequently but may use more resources
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

