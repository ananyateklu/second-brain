import React, { useMemo, useCallback } from 'react';
import { FileText, CheckSquare, AlarmClock, Link as LinkIcon, Award, Star, Zap, Activity, Archive } from 'lucide-react';
import { XPBreakdownResponse } from '../../../services/api/auth.service';
import { useTheme } from '../../../contexts/themeContextUtils';

// XP values for reference (should be kept consistent with backend)
const XP_VALUES = {
    CREATE_NOTE: 10,
    CREATE_IDEA: 20,
    CREATE_LINK: 5,
    COMPLETE_TASK: 15,
    COMPLETE_REMINDER: 15,
    CREATE_TASK: 3,
    CREATE_REMINDER: 3,
    UPDATE_CONTENT: 1,
    ARCHIVE_NOTE: 10,
    ARCHIVE_IDEA: 15
};

interface XPSourceData {
    source: string;
    icon: React.ReactNode;
    totalXP: number;
    percentage: number;
    color: string;
}

interface XPOverviewTabProps {
    data: XPBreakdownResponse;
    setActiveTab: React.Dispatch<React.SetStateAction<"overview" | "sources" | "actions" | "history">>;
}

export function XPOverviewTab({ data, setActiveTab }: XPOverviewTabProps) {
    const { theme } = useTheme();

    const processSourceData = useCallback((): XPSourceData[] => {
        const totalXP = data.xpBreakdown.bySource.reduce((sum, item) => sum + item.totalXP, 0);
        if (totalXP === 0) return [];

        const sources: XPSourceData[] = data.xpBreakdown.bySource.map(item => {
            const percentage = (item.totalXP / totalXP) * 100;

            let icon;
            let color;

            switch (item.source) {
                case 'Note':
                    icon = <FileText className="w-4 h-4" />;
                    color = theme === 'light' ? '#2563eb' : '#60a5fa';
                    break;
                case 'Idea':
                    icon = <Star className="w-4 h-4" />;
                    color = theme === 'light' ? '#f59e0b' : '#fcd34d';
                    break;
                case 'Task':
                    icon = <CheckSquare className="w-4 h-4" />;
                    color = theme === 'light' ? '#059669' : '#34d399';
                    break;
                case 'Reminder':
                    icon = <AlarmClock className="w-4 h-4" />;
                    color = theme === 'light' ? '#7c3aed' : '#a78bfa';
                    break;
                case 'Link':
                    icon = <LinkIcon className="w-4 h-4" />;
                    color = theme === 'light' ? '#06b6d4' : '#67e8f9';
                    break;
                case 'Achievement':
                    icon = <Award className="w-4 h-4" />;
                    color = theme === 'light' ? '#f97316' : '#fdba74';
                    break;
                case 'Archived':
                    icon = <Archive className="w-4 h-4" />;
                    color = theme === 'light' ? '#dc2626' : '#fb7185';
                    break;
                default:
                    icon = <Zap className="w-4 h-4" />;
                    color = theme === 'light' ? '#6b7280' : '#9ca3af';
            }

            return {
                source: item.source,
                icon,
                totalXP: item.totalXP,
                percentage,
                color
            };
        });
        sources.sort((a, b) => b.totalXP - a.totalXP);
        return sources;
    }, [data, theme]);

    const topSources: XPSourceData[] = useMemo(processSourceData, [processSourceData]);

    const totalXP = data.xpBreakdown.bySource.reduce((sum, item) => sum + item.totalXP, 0);

    return (
        <div className="space-y-4">
            {/* Total XP Card - More Compact */}
            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)] flex items-center gap-3">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-md">
                    <Activity className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <div>
                    <p className="text-xs text-[var(--color-textSecondary)]">Total XP Earned</p>
                    <h3 className="text-xl font-bold text-[var(--color-text)]">{totalXP.toLocaleString()}</h3>
                </div>
            </div>

            {/* Content Statistics - More Compact */}
            <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Content Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {/* Notes Card */}
                    <div className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)]">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-1.5 mb-1">
                                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-medium text-[var(--color-text)]">Notes</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="text-lg font-bold text-[var(--color-text)] leading-tight">{data.counts.notes}</div>
                                <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5">
                                    {XP_VALUES.CREATE_NOTE} XP each
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Ideas Card - Updated Color */}
                    <div className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)]">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Star className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                                <span className="text-xs font-medium text-[var(--color-text)]">Ideas</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="text-lg font-bold text-[var(--color-text)] leading-tight">{data.counts.ideas}</div>
                                <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5">
                                    {XP_VALUES.CREATE_IDEA} XP each
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Tasks Card */}
                    <div className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)]">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-[var(--color-text)]">Tasks</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="flex justify-between items-baseline gap-2">
                                    <div>
                                        <div className="text-base font-bold text-[var(--color-text)] leading-tight">{data.counts.tasks.total}</div>
                                        <div className="text-[10px] text-[var(--color-textSecondary)]">Total</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-[var(--color-text)] leading-tight">{data.counts.tasks.completed}</div>
                                        <div className="text-[10px] text-[var(--color-textSecondary)]">Done</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5">
                                    {XP_VALUES.COMPLETE_TASK} XP on completion
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Reminders Card - Updated Color */}
                    <div className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)]">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-1.5 mb-1">
                                <AlarmClock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-medium text-[var(--color-text)]">Reminders</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="flex justify-between items-baseline gap-2">
                                    <div>
                                        <div className="text-base font-bold text-[var(--color-text)] leading-tight">{data.counts.reminders.total}</div>
                                        <div className="text-[10px] text-[var(--color-textSecondary)]">Total</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-[var(--color-text)] leading-tight">{data.counts.reminders.completed}</div>
                                        <div className="text-[10px] text-[var(--color-textSecondary)]">Done</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5">
                                    {XP_VALUES.COMPLETE_REMINDER} XP on completion
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top XP Sources - More Compact */}
            {topSources.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">Top XP Sources</h3>
                        <button
                            className="text-xs text-[var(--color-accent)] hover:underline"
                            onClick={() => setActiveTab('sources')}
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {topSources.slice(0, 3).map((source) => (
                            <div
                                key={source.source}
                                className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)] flex items-center"
                            >
                                <div className="p-1.5 rounded-md mr-2" style={{ backgroundColor: `${source.color}20` }}>
                                    <div className="text-center" style={{ color: source.color }}>
                                        {source.icon}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-[var(--color-text)]">{source.source}</span>
                                        <span className="text-xs text-[var(--color-textSecondary)]">{source.totalXP.toLocaleString()} XP</span>
                                    </div>
                                    <div className="mt-1 bg-[var(--color-border)] h-1 rounded-full w-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${source.percentage}%`,
                                                backgroundColor: source.color
                                            }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-[var(--color-textSecondary)] mt-0.5 text-right">
                                        {source.percentage.toFixed(1)}% of total XP
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 