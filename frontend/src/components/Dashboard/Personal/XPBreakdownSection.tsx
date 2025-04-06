import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, RefreshCw, History } from 'lucide-react';
import { XPBreakdownResponse } from '../../../services/api/auth.service';
import { XPOverviewTab } from './XPOverviewTab';
import { XPSourcesTab } from './XPSourcesTab';
import { XPActionsTab } from './XPActionsTab';
import { XPHistoryTab } from './XPHistoryTab';

interface XPBreakdownSectionProps {
    data: XPBreakdownResponse | null;
    loading: boolean;
    error: string | null;
    seedingXP: boolean;
    onSeedXPHistory: () => void;
}

export function XPBreakdownSection({
    data,
    loading,
    error,
    seedingXP,
    onSeedXPHistory
}: XPBreakdownSectionProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'actions' | 'history'>('overview');

    const cardClasses = `
        relative
        overflow-hidden
        rounded-xl
        bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]
        dark:bg-gray-900/30
        midnight:bg-[#1e293b]/30
        backdrop-blur-xl
        border-[0.5px]
        border-white/10
        shadow-md dark:shadow-lg
        ring-1
        ring-white/5
    `;

    if (loading) {
        return (
            <motion.div className={cardClasses}>
                <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[var(--color-accent)]/10 rounded-md border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-xs text-[var(--color-textSecondary)]">Experience distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center h-[250px]">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin mb-2" />
                        <p className="text-sm text-[var(--color-textSecondary)]">Loading XP data...</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (error || !data) {
        return (
            <motion.div className={cardClasses}>
                <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[var(--color-accent)]/10 rounded-md border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-xs text-[var(--color-textSecondary)]">Experience distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center h-[250px]">
                    <p className="text-sm text-red-500 dark:text-red-400 text-center px-4">Error loading XP data. Please try again later.</p>
                </div>
            </motion.div>
        );
    }

    if (!data.xpBreakdown.bySource.length || !data.xpBreakdown.byAction.length) {
        return (
            <motion.div className={cardClasses}>
                <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[var(--color-accent)]/10 rounded-md border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-xs text-[var(--color-textSecondary)]">Experience distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center h-[250px] p-4">
                    <p className="text-sm text-[var(--color-textSecondary)] mb-3 text-center">
                        No XP history data found. Initialize it from your existing content.
                    </p>
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-accent)] text-[var(--color-surface)] rounded-md hover:bg-[var(--color-accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        onClick={onSeedXPHistory}
                        disabled={seedingXP}
                    >
                        {seedingXP ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Generate History
                            </>
                        )}
                    </button>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-3 max-w-sm text-center">
                        This generates XP history from your notes, tasks, etc. Only needs to be done once.
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div className={cardClasses}>
            <div className="p-4 border-b border-[var(--color-border)]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="p-1.5 bg-[var(--color-accent)]/10 rounded-md border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-xs text-[var(--color-textSecondary)]">Experience distribution</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap space-x-1 bg-[var(--color-surfaceHover)]/50 p-0.5 rounded-md w-full sm:w-auto">
                        <button
                            className={`flex-1 sm:flex-none px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'overview'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                                }`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`flex-1 sm:flex-none px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'sources'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                                }`}
                            onClick={() => setActiveTab('sources')}
                        >
                            Sources
                        </button>
                        <button
                            className={`flex-1 sm:flex-none px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'actions'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                                }`}
                            onClick={() => setActiveTab('actions')}
                        >
                            Actions
                        </button>
                        <button
                            className={`flex-1 sm:flex-none px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'history'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                                }`}
                            onClick={() => setActiveTab('history')}
                        >
                            <span className="flex items-center gap-1">
                                <History className="w-3 h-3" />
                                History
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'overview' && <XPOverviewTab data={data} setActiveTab={setActiveTab} />}
                {activeTab === 'sources' && <XPSourcesTab data={data} />}
                {activeTab === 'actions' && <XPActionsTab data={data} />}
                {activeTab === 'history' && <XPHistoryTab />}
            </div>
        </motion.div>
    );
} 