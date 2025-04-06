import React, { useMemo, useCallback } from 'react';
import { FileText, CheckSquare, AlarmClock, Link as LinkIcon, Award, Star, Zap, Archive } from 'lucide-react';
import { XPBreakdownResponse } from '../../../services/api/auth.service';
import { useTheme } from '../../../contexts/themeContextUtils';

interface XPSourceData {
    source: string;
    icon: React.ReactNode;
    totalXP: number;
    percentage: number;
    color: string;
}

interface XPSourcesTabProps {
    data: XPBreakdownResponse;
}

export function XPSourcesTab({ data }: XPSourcesTabProps) {
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
                    icon = <FileText className="w-5 h-5" />;
                    color = theme === 'light' ? '#2563eb' : '#60a5fa'; // blue
                    break;
                case 'Idea':
                    icon = <Star className="w-5 h-5" />;
                    color = theme === 'light' ? '#f59e0b' : '#fcd34d'; // yellow
                    break;
                case 'Task':
                    icon = <CheckSquare className="w-5 h-5" />;
                    color = theme === 'light' ? '#059669' : '#34d399'; // green
                    break;
                case 'Reminder':
                    icon = <AlarmClock className="w-5 h-5" />;
                    color = theme === 'light' ? '#7c3aed' : '#a78bfa'; // purple
                    break;
                case 'Link':
                    icon = <LinkIcon className="w-5 h-5" />;
                    color = theme === 'light' ? '#06b6d4' : '#67e8f9'; // cyan
                    break;
                case 'Achievement':
                    icon = <Award className="w-5 h-5" />;
                    color = theme === 'light' ? '#f97316' : '#fdba74'; // orange
                    break;
                case 'Archived':
                    icon = <Archive className="w-5 h-5" />;
                    color = theme === 'light' ? '#dc2626' : '#fb7185'; // red
                    break;
                default:
                    icon = <Zap className="w-5 h-5" />;
                    color = theme === 'light' ? '#6b7280' : '#9ca3af'; // gray
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

    const sourceData: XPSourceData[] = useMemo(processSourceData, [processSourceData]);
    const totalXP = sourceData.reduce((sum, item) => sum + item.totalXP, 0);

    return (
        <div>
            <div className="bg-[var(--color-surfaceHover)]/50 rounded-lg border border-[var(--color-border)] overflow-hidden">
                <table className="w-full text-[var(--color-text)]">
                    <thead className="bg-[var(--color-surface)]">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-sm text-[var(--color-textSecondary)]">Source</th>
                            <th className="px-4 py-3 text-right font-medium text-sm text-[var(--color-textSecondary)]">XP Earned</th>
                            <th className="px-4 py-3 text-right font-medium text-sm text-[var(--color-textSecondary)]">% of Total</th>
                            <th className="px-4 py-3 text-left font-medium text-sm text-[var(--color-textSecondary)] w-1/3">XP Distribution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {sourceData.map((source) => (
                            <tr key={source.source} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center">
                                        <div className="p-1.5 rounded-md mr-3" style={{ backgroundColor: `${source.color}20` }}>
                                            <div style={{ color: source.color }}>
                                                {source.icon}
                                            </div>
                                        </div>
                                        <span className="font-medium text-sm">{source.source}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-right">{source.totalXP.toLocaleString()}</td>
                                <td className="px-4 py-3 font-mono text-sm text-right">{source.percentage.toFixed(1)}%</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center">
                                        <div className="flex-1">
                                            <div className="bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${source.percentage}%`,
                                                        backgroundColor: source.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-[var(--color-surface)]/80">
                        <tr>
                            <td className="px-4 py-3 font-medium text-sm">Total</td>
                            <td className="px-4 py-3 font-medium font-mono text-sm text-right">{totalXP.toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium font-mono text-sm text-right">100%</td>
                            <td className="px-4 py-3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
} 