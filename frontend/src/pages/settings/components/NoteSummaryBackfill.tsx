import { useState, useMemo, useEffect, useRef } from 'react';
import { useNotes } from '../../../features/notes/hooks/use-notes-query';
import { useStartSummaryGeneration } from '../../../features/notes/hooks/use-summary-generation';
import { useBoundStore } from '../../../store/bound-store';
import { toast } from '../../../hooks/use-toast';
import type { NoteListItem } from '../../../types/notes';

export function NoteSummaryBackfill() {
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

    const truncateTitle = (title: string, maxLength = 40) => {
        if (title.length <= maxLength) return title;
        return title.slice(0, maxLength) + '...';
    };

    return (
        <section
            className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl lg:col-span-2"
            style={{
                backgroundColor: 'var(--surface-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)',
            }}
        >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                        }}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wider leading-none block" style={{ color: 'var(--text-secondary)' }}>
                            Backfill
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Generate Missing Summaries
                            </h3>
                            <div className="relative group">
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-success)]"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                                        color: 'var(--color-success)',
                                    }}
                                    aria-label="How backfill works"
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
                                        Use this tool to generate AI summaries for notes created before the summary feature was enabled.
                                        Each summary uses your configured AI provider and model.
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
                            {isLoadingNotes ? 'Loading notes...' : (
                                notesWithoutSummaries.length === 0
                                    ? 'All notes have summaries!'
                                    : `${notesWithoutSummaries.length} note${notesWithoutSummaries.length !== 1 ? 's' : ''} without summaries`
                            )}
                        </p>
                    </div>
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
                    {/* Select All Header */}
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
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
                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            ({notesWithoutSummaries.length} notes)
                        </span>
                    </div>

                    {/* Notes List */}
                    <div
                        className="max-h-[20.7rem] overflow-y-auto rounded-xl border"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        {notesWithoutSummaries.map((note: NoteListItem) => (
                            <div
                                key={note.id}
                                className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-[color:var(--surface-elevated)]"
                                style={{ borderColor: 'var(--border)' }}
                                onClick={() => handleSelectNote(note.id)}
                            >
                                <div
                                        className="w-4 h-4 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all"
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
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {truncateTitle(note.title)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                            {formatDate(note.updatedAt)}
                                        </span>
                                        {note.tags.length > 0 && (
                                            <>
                                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                                    {note.tags.slice(0, 3).join(', ')}
                                                    {note.tags.length > 3 && ` +${note.tags.length - 3}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </section>
    );
}
