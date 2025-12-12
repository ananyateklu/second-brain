import { useState, useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '../../../store/settings-store';
import { useAIHealth } from '../../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../../utils/model-name-formatter';
import { toast } from '../../../hooks/use-toast';
import { useNotes } from '../../../features/notes/hooks/use-notes-query';
import { useStartSummaryGeneration } from '../../../features/notes/hooks/use-summary-generation';
import { useBoundStore } from '../../../store/bound-store';
import type { NoteListItem } from '../../../types/notes';

// Mapping from health data provider names to display names
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
    'OpenAI': 'OpenAI',
    'Claude': 'Anthropic',
    'Gemini': 'Google Gemini',
    'Ollama': 'Ollama',
    'Grok': 'xAI (Grok)',
};

// Custom Model Selector Component
interface ModelSelectorProps {
    availableModels: string[];
    selectedModel: string | null;
    onModelChange: (model: string) => Promise<void>;
    disabled: boolean;
    noteSummaryProvider: string | null;
}

function ModelSelector({ availableModels, selectedModel, onModelChange, disabled, noteSummaryProvider }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close dropdown on Escape key
    useEffect(() => {
        if (!isOpen) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleSelect = async (model: string) => {
        setIsOpen(false);
        await onModelChange(model);
    };

    if (availableModels.length === 0) {
        return (
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-success)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Model
                    </label>
                    <div className="px-3 py-2 rounded-2xl text-xs w-48" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                        {noteSummaryProvider ? 'No models available' : 'Select provider first'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-success)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Model
                </label>

                <div className="relative" ref={dropdownRef}>
                    {/* Dropdown Button */}
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                        className="w-56 flex items-center justify-between gap-3 px-3 py-2 rounded-2xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)]"
                        style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: isOpen ? 'var(--color-brand-600)' : 'var(--border)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {/* Selected Model Text */}
                        <span className="flex-1 text-left truncate">
                            {selectedModel ? formatModelName(selectedModel) : 'Select model'}
                        </span>

                        {/* Chevron Icon with proper right padding */}
                        <svg
                            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            style={{
                                color: 'var(--text-secondary)',
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div
                            className="absolute top-full left-0 right-0 mt-1 rounded-2xl border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                            style={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                boxShadow: 'var(--shadow-xl)',
                            }}
                        >
                            <div className="max-h-60 overflow-y-auto">
                                {availableModels.map((model) => {
                                    const isSelected = model === selectedModel;
                                    return (
                                        <button
                                            key={model}
                                            type="button"
                                            onClick={() => void handleSelect(model)}
                                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium text-left transition-all duration-150 hover:bg-[color:color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]"
                                            style={{
                                                backgroundColor: isSelected
                                                    ? 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)'
                                                    : 'transparent',
                                                color: isSelected ? 'var(--color-brand-600)' : 'var(--text-primary)',
                                            }}
                                        >
                                            <span className="truncate">{formatModelName(model)}</span>
                                            {isSelected && (
                                                <svg
                                                    className="w-4 h-4 flex-shrink-0"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2.5}
                                                    style={{ color: 'var(--color-brand-600)' }}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function NoteSummarySettings() {
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

    // Backfill functionality
    const { data: notes, isLoading: isLoadingNotes, refetch: refetchNotes } = useNotes();
    const startSummaryGeneration = useStartSummaryGeneration();
    const {
        activeJob: activeSummaryJob,
        startSummaryJob,
        showSummaryNotification,
    } = useBoundStore();

    // Get user for job tracking
    const user = useBoundStore((state) => state.user);
    const userId = user?.userId ?? 'default-user';

    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const previousJobStatusRef = useRef<string | undefined>(undefined);

    // Job is generating if there's an active job running or pending
    const isGenerating = activeSummaryJob?.status?.status === 'running' || activeSummaryJob?.status?.status === 'pending';
    const jobStatus = activeSummaryJob?.status?.status;

    // Refetch notes when job completes, fails, or is cancelled
    useEffect(() => {
        const previousStatus = previousJobStatusRef.current;
        const wasGenerating = previousStatus === 'running' || previousStatus === 'pending';
        const isNowComplete = jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'cancelled';

        if (wasGenerating && isNowComplete) {
            // Job just finished - refetch notes to show updated summaries
            void refetchNotes();
        }

        // Update ref for next comparison
        previousJobStatusRef.current = jobStatus;
    }, [jobStatus, refetchNotes]);

    // Filter notes without summaries
    const notesWithoutSummaries = useMemo(() => {
        if (!notes) return [];
        return notes.filter((note) => !note.summary || note.summary.trim() === '');
    }, [notes]);

    const handleSelectAll = () => {
        if (selectedNotes.size === notesWithoutSummaries.length) {
            setSelectedNotes(new Set());
        } else {
            setSelectedNotes(new Set(notesWithoutSummaries.map((n) => n.id)));
        }
    };

    const handleSelectNote = (noteId: string) => {
        const newSelected = new Set(selectedNotes);
        if (newSelected.has(noteId)) {
            newSelected.delete(noteId);
        } else {
            newSelected.add(noteId);
        }
        setSelectedNotes(newSelected);
    };

    const handleGenerateSummaries = async () => {
        const noteIds = Array.from(selectedNotes);
        if (noteIds.length === 0) {
            toast.warning('No Notes Selected', 'Please select at least one note to generate summaries.');
            return;
        }

        if (isGenerating) {
            // If already generating, just show the notification
            showSummaryNotification();
            return;
        }

        try {
            const job = await startSummaryGeneration.mutateAsync(noteIds);
            startSummaryJob(job, userId);
            // Clear selection after starting the job
            setSelectedNotes(new Set());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start summary generation';
            toast.error('Generation Failed', message);
        }
    };

    const handleGenerateAll = async () => {
        if (notesWithoutSummaries.length === 0) {
            toast.info('All Done', 'All notes already have summaries.');
            return;
        }

        if (isGenerating) {
            // If already generating, just show the notification
            showSummaryNotification();
            return;
        }

        try {
            const noteIds = notesWithoutSummaries.map((n) => n.id);
            const job = await startSummaryGeneration.mutateAsync(noteIds);
            startSummaryJob(job, userId);
            setSelectedNotes(new Set());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start summary generation';
            toast.error('Generation Failed', message);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <section
            className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
            style={{
                backgroundColor: 'var(--surface-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)',
            }}
        >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                        }}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                AI Features
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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
                                    className="absolute left-0 top-full mt-2 w-64 p-3 rounded-2xl border text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10"
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
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Automatically generate AI summaries for your notes
                        </p>
                    </div>
                </div>
            </div>

            {/* Inline Controls - All visible together */}
            <div className="space-y-3">
                {/* Generate on Create/Update Toggle, Provider, and Model - Inline */}
                <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                    {/* Generate on Create/Update Toggle */}
                    <div className="flex items-center justify-between rounded-xl min-w-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl flex-shrink-0" style={{ backgroundColor: 'var(--surface-card)' }}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: noteSummaryEnabled ? 'var(--color-brand-600)' : 'var(--text-secondary)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <label className="text-xs font-medium block truncate" style={{ color: 'var(--text-primary)' }}>
                                    Generate summaries when notes are created or updated
                                </label>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleToggleEnabled()}
                            disabled={isSavingEnabled}
                            className="relative inline-flex h-7 w-13 items-center rounded-full transition-all duration-300 flex-shrink-0 ml-2 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    transform: noteSummaryEnabled ? 'translateX(1.75rem)' : 'translateX(0.25rem)',
                                }}
                            />
                        </button>
                    </div>

                    {/* Provider and Model grouped together */}
                    <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center flex-shrink-0">
                        {/* Provider Selection */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-success)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    AI Provider
                                </label>
                                {isHealthLoading ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-2xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-xs">Loading providers...</span>
                                    </div>
                                ) : availableProviders.length === 0 ? (
                                    <div className="p-2.5 rounded-2xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
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
                                                    disabled={isSavingProvider || !noteSummaryEnabled}
                                                    className="px-3 py-2 rounded-2xl border text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </div>

                        {/* Model Selection */}
                        <ModelSelector
                            availableModels={availableModels}
                            selectedModel={noteSummaryModel}
                            onModelChange={handleModelChange}
                            disabled={isSavingModel || !noteSummaryEnabled || !noteSummaryProvider}
                            noteSummaryProvider={noteSummaryProvider}
                        />
                    </div>
                </div>
            </div>

            {/* Backfill Section */}
            <div className="mt-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {isLoadingNotes ? 'Loading notes...' : (
                                notesWithoutSummaries.length === 0
                                    ? 'All notes have summaries!'
                                    : `${notesWithoutSummaries.length} note${notesWithoutSummaries.length !== 1 ? 's' : ''} without summaries`
                            )}
                        </p>
                        {/* Select All Toggle - moved up next to count */}
                        {notesWithoutSummaries.length > 0 && (
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl ml-2"
                                style={{ backgroundColor: 'var(--surface-elevated)' }}
                            >
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <div
                                        className="w-4 h-4 rounded-xl border-2 flex items-center justify-center transition-all"
                                        style={{
                                            borderColor: selectedNotes.size === notesWithoutSummaries.length
                                                ? 'var(--color-brand-600)'
                                                : 'var(--border)',
                                            backgroundColor: selectedNotes.size === notesWithoutSummaries.length
                                                ? 'var(--color-brand-600)'
                                                : 'transparent',
                                        }}
                                    >
                                        {selectedNotes.size === notesWithoutSummaries.length && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    {selectedNotes.size === notesWithoutSummaries.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {notesWithoutSummaries.length > 0 && (
                        <div className="flex gap-2">
                            {isGenerating ? (
                                <button
                                    type="button"
                                    onClick={() => showSummaryNotification()}
                                    className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))',
                                        borderColor: 'var(--color-brand-600)',
                                        color: 'var(--color-brand-600)',
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>
                                            Generating... {activeSummaryJob?.status?.progressPercentage ?? 0}%
                                        </span>
                                    </div>
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => void handleGenerateSummaries()}
                                        disabled={selectedNotes.size === 0}
                                        className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                        style={{
                                            backgroundColor: selectedNotes.size > 0
                                                ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                : 'var(--surface-elevated)',
                                            borderColor: selectedNotes.size > 0
                                                ? 'var(--color-brand-600)'
                                                : 'var(--border)',
                                            color: selectedNotes.size > 0
                                                ? 'var(--color-brand-600)'
                                                : 'var(--text-secondary)',
                                        }}
                                    >
                                        Generate Selected ({selectedNotes.size})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleGenerateAll()}
                                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: 'var(--color-brand-600)',
                                            color: 'white',
                                        }}
                                    >
                                        Generate All
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Notes List */}
                {isLoadingNotes ? (
                    <div className="flex items-center justify-center py-6">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                ) : notesWithoutSummaries.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-6 rounded-xl"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                    >
                        <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--color-brand-600)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            All notes have summaries
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            New notes will automatically get summaries when created
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {/* Notes Grid */}
                        <div
                            className="max-h-[18.2rem] overflow-y-auto rounded-xl p-1.5"
                            style={{ backgroundColor: 'var(--surface-elevated)' }}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                                {notesWithoutSummaries.map((note: NoteListItem) => (
                                    <div
                                        key={note.id}
                                        className="relative group rounded-xl border p-1.5 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: selectedNotes.has(note.id)
                                                ? 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-card))'
                                                : 'var(--surface-card)',
                                            borderColor: selectedNotes.has(note.id)
                                                ? 'var(--color-brand-600)'
                                                : 'var(--border)',
                                            boxShadow: selectedNotes.has(note.id)
                                                ? '0 2px 8px color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
                                                : 'var(--shadow-sm)',
                                        }}
                                        onClick={() => handleSelectNote(note.id)}
                                    >
                                        {/* Checkbox */}
                                        <div className="absolute top-1 right-1">
                                            <div
                                                className="w-3 h-3 rounded-xl border flex items-center justify-center transition-all"
                                                style={{
                                                    borderColor: selectedNotes.has(note.id)
                                                        ? 'var(--color-brand-600)'
                                                        : 'var(--border)',
                                                    backgroundColor: selectedNotes.has(note.id)
                                                        ? 'var(--color-brand-600)'
                                                        : 'transparent',
                                                }}
                                            >
                                                {selectedNotes.has(note.id) && (
                                                    <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Note Icon and Title with Date - Inline */}
                                        <div className="flex items-start gap-1 mb-0.5 pr-3">
                                            <div
                                                className="w-5 h-5 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                                }}
                                            >
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[10px] font-semibold line-clamp-2 leading-tight mb-0.5" style={{ color: 'var(--text-primary)' }}>
                                                    {note.title}
                                                </h4>
                                                {/* Date under title */}
                                                <div className="flex items-center gap-0.5">
                                                    <svg className="w-2 h-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-[8px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatDate(note.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {note.tags.length > 0 && (
                                            <div className="flex items-center gap-0.5">
                                                <span
                                                    className="px-1 py-0.5 rounded-xl text-[7px] font-medium truncate max-w-[calc(100%-20px)]"
                                                    style={{
                                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                                                        color: 'var(--color-brand-600)',
                                                    }}
                                                >
                                                    {note.tags[0]}
                                                </span>
                                                {note.tags.length > 1 && (
                                                    <span
                                                        className="px-1 py-0.5 rounded-xl text-[7px] font-medium flex-shrink-0"
                                                        style={{
                                                            backgroundColor: 'var(--surface-elevated)',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        +{note.tags.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
