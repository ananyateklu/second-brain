import { useState, useEffect } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, FileText, Star, CheckSquare, AlarmClock, Link as LinkIcon, Archive, Award, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { authService, XPHistoryItem, XPHistoryResponse } from '../../../services/api/auth.service';
import { format, formatDistance } from 'date-fns';

interface XPHistoryTabProps {
    initialData?: XPHistoryResponse;
}

export function XPHistoryTab({ initialData }: XPHistoryTabProps) {
    const [historyData, setHistoryData] = useState<XPHistoryResponse | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!initialData) {
            fetchHistory(1);
        }
    }, [initialData]);

    const fetchHistory = async (page: number) => {
        try {
            setLoading(true);
            setError(null);
            const data = await authService.getXPHistory(page, 10);
            setHistoryData(data);
        } catch (err) {
            console.error('Error fetching XP history:', err);
            setError('Failed to load XP history data');
        } finally {
            setLoading(false);
        }
    };

    const getSourceIcon = (source: string) => {
        const iconClasses = 'w-4 h-4';
        switch (source.toLowerCase()) {
            case 'note':
                return <FileText className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
            case 'idea':
                return <Star className={`${iconClasses} text-yellow-600 dark:text-yellow-400`} />;
            case 'task':
                return <CheckSquare className={`${iconClasses} text-green-600 dark:text-green-400`} />;
            case 'reminder':
                return <AlarmClock className={`${iconClasses} text-purple-600 dark:text-purple-400`} />;
            case 'link':
                return <LinkIcon className={`${iconClasses} text-cyan-600 dark:text-cyan-400`} />;
            case 'achievement':
                return <Award className={`${iconClasses} text-orange-600 dark:text-orange-400`} />;
            case 'archived':
                return <Archive className={`${iconClasses} text-red-600 dark:text-red-400`} />;
            default:
                return <Award className={`${iconClasses} text-gray-600 dark:text-gray-400`} />;
        }
    };

    const getActionIcon = (action: string) => {
        const iconClasses = 'w-4 h-4';
        switch (action.toLowerCase()) {
            case 'create':
                return <FileText className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
            case 'complete':
                return <CheckCircle className={`${iconClasses} text-green-600 dark:text-green-400`} />;
            case 'update':
                return <RefreshCw className={`${iconClasses} text-orange-600 dark:text-orange-400`} />;
            case 'archive':
                return <Archive className={`${iconClasses} text-purple-600 dark:text-purple-400`} />;
            default:
                return <Clock className={`${iconClasses} text-gray-600 dark:text-gray-400`} />;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return {
                full: format(date, 'MMM d, yyyy h:mm a'),
                relative: formatDistance(date, new Date(), { addSuffix: true })
            };
        } catch {
            return { full: 'Invalid date', relative: 'Unknown' };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin mb-4" />
                <p className="text-sm text-[var(--color-textSecondary)]">Loading XP history...</p>
            </div>
        );
    }

    if (error || !historyData) {
        return (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-center">
                {error || 'Failed to load XP history data. Please try again.'}
            </div>
        );
    }

    const { history, pagination } = historyData;

    return (
        <div className="space-y-4">
            <div className="bg-[var(--color-surfaceHover)]/50 rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--color-surface)]">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]">SOURCE</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]">ACTION</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]">ITEM</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)]">XP</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)]">DATE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--color-textSecondary)]">
                                        No XP history records found.
                                    </td>
                                </tr>
                            ) : (
                                history.map((item: XPHistoryItem) => {
                                    const dateInfo = formatDate(item.createdAt);
                                    return (
                                        <tr key={item.id} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getSourceIcon(item.source)}
                                                    <span className="text-sm font-medium text-[var(--color-text)]">{item.source}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getActionIcon(item.action)}
                                                    <span className="text-sm text-[var(--color-text)]">{item.action}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-[var(--color-text)] line-clamp-1" title={item.itemTitle || 'N/A'}>
                                                    {item.itemTitle || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-mono font-medium text-green-600 dark:text-green-400">
                                                    +{item.amount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs text-[var(--color-text)]">{dateInfo.full}</span>
                                                    <span className="text-xs text-[var(--color-textSecondary)]">{dateInfo.relative}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-textSecondary)]">
                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of{' '}
                            <span className="font-medium">{pagination.total}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={`p-1 rounded text-[var(--color-textSecondary)] ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                onClick={() => pagination.page > 1 && fetchHistory(pagination.page - 1)}
                                disabled={pagination.page === 1}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="text-xs font-medium text-[var(--color-text)]">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>

                            <button
                                className={`p-1 rounded text-[var(--color-textSecondary)] ${pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                onClick={() => pagination.page < pagination.totalPages && fetchHistory(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 