import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../utils/model-name-formatter';
import { toast } from '../../hooks/use-toast';
import { NoteSummaryBackfill } from './components/NoteSummaryBackfill';

// Mapping from health data provider names to display names
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
    'OpenAI': 'OpenAI',
    'Claude': 'Anthropic',
    'Gemini': 'Google Gemini',
    'Ollama': 'Ollama',
    'Grok': 'xAI (Grok)',
};

export function GeneralSettings() {
    const {
        noteSummaryEnabled,
        noteSummaryProvider,
        noteSummaryModel,
        setNoteSummaryEnabled,
        setNoteSummaryProvider,
        setNoteSummaryModel,
    } = useSettingsStore();

    // Get AI health data to determine available providers and models
    const { data: healthData, isLoading: isHealthLoading } = useAIHealth();

    // Local state for dropdowns
    const [isSavingEnabled, setIsSavingEnabled] = useState(false);
    const [isSavingProvider, setIsSavingProvider] = useState(false);
    const [isSavingModel, setIsSavingModel] = useState(false);

    // Get available providers from health data (only healthy ones)
    const availableProviders = useMemo(() => {
        return healthData?.providers
            ?.filter(p => p.isHealthy && p.availableModels && p.availableModels.length > 0)
            ?.map(p => ({
                id: p.provider,
                name: PROVIDER_DISPLAY_NAMES[p.provider] || p.provider,
                models: p.availableModels || [],
            })) || [];
    }, [healthData?.providers]);

    // Get models for the selected provider
    const availableModels = useMemo(() => {
        const selectedProviderData = availableProviders.find(p => p.id === noteSummaryProvider);
        return selectedProviderData?.models || [];
    }, [availableProviders, noteSummaryProvider]);

    // Reset model when provider changes if current model is not available
    useEffect(() => {
        if (noteSummaryProvider && availableModels.length > 0 && noteSummaryModel) {
            if (!availableModels.includes(noteSummaryModel)) {
                // Current model not available for this provider, reset to first available
                void setNoteSummaryModel(availableModels[0], true);
            }
        }
    }, [noteSummaryProvider, availableModels, noteSummaryModel, setNoteSummaryModel]);

    const handleToggleEnabled = async () => {
        setIsSavingEnabled(true);
        try {
            await setNoteSummaryEnabled(!noteSummaryEnabled, true);
            toast.success(
                noteSummaryEnabled ? 'Note Summaries Disabled' : 'Note Summaries Enabled',
                noteSummaryEnabled
                    ? 'AI summaries will no longer be generated for new notes.'
                    : 'AI summaries will be generated for new and updated notes.'
            );
        } catch {
            toast.error('Failed to update', 'Could not save the note summary setting.');
        } finally {
            setIsSavingEnabled(false);
        }
    };

    const handleProviderChange = async (providerId: string) => {
        setIsSavingProvider(true);
        try {
            await setNoteSummaryProvider(providerId, true);
            // Auto-select first model for the new provider
            const provider = availableProviders.find(p => p.id === providerId);
            if (provider && provider.models.length > 0) {
                await setNoteSummaryModel(provider.models[0], true);
            }
            toast.success('Provider Updated', `Note summaries will now use ${PROVIDER_DISPLAY_NAMES[providerId] || providerId}.`);
        } catch {
            toast.error('Failed to update', 'Could not save the provider setting.');
        } finally {
            setIsSavingProvider(false);
        }
    };

    const handleModelChange = async (model: string) => {
        setIsSavingModel(true);
        try {
            await setNoteSummaryModel(model, true);
            toast.success('Model Updated', `Note summaries will now use ${formatModelName(model)}.`);
        } catch {
            toast.error('Failed to update', 'Could not save the model setting.');
        } finally {
            setIsSavingModel(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Developer and Display Options - Inline */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Developer Section - Notification Testing */}
                <section
                    className="rounded-2xl border p-4 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex items-start gap-2 mb-4">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                            }}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                Developer
                            </span>
                            <h3 className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                                Notification Testing
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                        const loadingId = toast.loading('Loading...');
                                        setTimeout(() => {
                                            if (loadingId) {
                                                toast.dismiss(loadingId);
                                                toast.success('Loaded!', 'The operation completed.');
                                            }
                                        }, 2000);
                                    }}
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                            success: (data) => data,
                                            error: 'Failed to fetch data',
                                        });
                                    }}
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                                    className="px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
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
                </section>

                {/* Note Summary Settings Section */}
                <section
                    className="rounded-2xl border p-4 transition-all duration-200 hover:shadow-xl"
                    style={{
                        backgroundColor: 'var(--surface-card)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-start gap-2">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                }}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                    AI Features
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        Note Summaries
                                    </h3>
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            className="flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-success)]"
                                            style={{
                                                backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                                                color: 'var(--color-success)',
                                            }}
                                            aria-label="How note summaries work"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        <div
                                            className="absolute left-0 top-full mt-2 w-64 p-3 rounded-xl border text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10"
                                            style={{
                                                backgroundColor: 'var(--surface-elevated)',
                                                borderColor: 'var(--color-success)',
                                                color: 'var(--text-secondary)',
                                                boxShadow: 'var(--shadow-lg)',
                                            }}
                                        >
                                            <p>
                                                When enabled, AI will automatically generate a concise summary of each note based on its title, tags, and content.
                                                Summaries are displayed in the notes list for quick reference without loading full content.
                                            </p>
                                            <div
                                                className="absolute left-4 -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
                                                style={{
                                                    borderBottomColor: 'var(--color-success)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    Automatically generate AI summaries for your notes
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--surface-card)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: noteSummaryEnabled ? 'var(--color-brand-600)' : 'var(--text-secondary)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block" style={{ color: 'var(--text-primary)' }}>
                                        Enable AI Summaries
                                    </label>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        Generate summaries when notes are created or updated
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleToggleEnabled()}
                                disabled={isSavingEnabled}
                                className="relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: noteSummaryEnabled ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--border) 60%, transparent)',
                                    boxShadow: noteSummaryEnabled
                                        ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)'
                                        : 'none',
                                }}
                            >
                                <span
                                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md"
                                    style={{
                                        transform: noteSummaryEnabled ? 'translateX(1.625rem)' : 'translateX(0.25rem)',
                                    }}
                                />
                            </button>
                        </div>

                        {/* Provider and Model Selection - Inline */}
                        <div className={`flex flex-col sm:flex-row gap-4 ${noteSummaryEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                            {/* Provider Selection */}
                            <div className="flex-1">
                                <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    AI Provider
                                </label>
                                {isHealthLoading ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-xs">Loading...</span>
                                    </div>
                                ) : availableProviders.length === 0 ? (
                                    <div className="p-2.5 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                                        No providers available
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {availableProviders.map((provider) => {
                                            const isActive = noteSummaryProvider === provider.id;
                                            return (
                                                <button
                                                    key={provider.id}
                                                    type="button"
                                                    onClick={() => void handleProviderChange(provider.id)}
                                                    disabled={isSavingProvider}
                                                    className="px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                    {provider.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Model Selection */}
                            <div className={`flex-1 ${noteSummaryProvider ? '' : 'opacity-50 pointer-events-none'}`}>
                                <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Model
                                </label>
                                {availableModels.length === 0 ? (
                                    <div className="p-2.5 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                                        {noteSummaryProvider ? 'No models available' : 'Select provider first'}
                                    </div>
                                ) : (
                                    <select
                                        value={noteSummaryModel || ''}
                                        onChange={(e) => void handleModelChange(e.target.value)}
                                        disabled={isSavingModel}
                                        className="w-full px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: 'var(--surface-elevated)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {availableModels.map((model) => (
                                            <option key={model} value={model}>
                                                {formatModelName(model)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                    </div>
                </section>
            </div>

            {/* Note Summary Backfill Section */}
            <div className="grid gap-4 lg:grid-cols-2">
                <NoteSummaryBackfill />
            </div>

        </div>
    );
}

