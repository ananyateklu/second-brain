import { useMemo, useCallback } from 'react';
import { FileText, CheckSquare, AlarmClock } from 'lucide-react';
import { XPBreakdownResponse } from '../../../services/api/auth.service';

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

interface XPActionData {
    action: string;
    description: string;
    totalXP: number;
    percentage: number;
}

interface XPActionsTabProps {
    data: XPBreakdownResponse;
}

export function XPActionsTab({ data }: XPActionsTabProps) {
    const processActionData = useCallback((): XPActionData[] => {
        const totalXP = data.xpBreakdown.byAction.reduce((sum, item) => sum + item.totalXP, 0);
        if (totalXP === 0) return [];

        const actions: XPActionData[] = data.xpBreakdown.byAction.map(item => {
            const percentage = (item.totalXP / totalXP) * 100;
            let description;
            switch (item.action.toLowerCase()) {
                case 'create':
                    description = 'Creating new content';
                    break;
                case 'complete':
                    description = 'Completing tasks/reminders';
                    break;
                case 'update':
                    description = 'Updating existing content';
                    break;
                case 'archive':
                    description = 'Archiving notes/ideas';
                    break;
                default:
                    description = 'Other actions';
            }
            return {
                action: item.action,
                description,
                totalXP: item.totalXP,
                percentage
            };
        });
        actions.sort((a, b) => b.totalXP - a.totalXP);
        return actions;
    }, [data]);

    const actionData: XPActionData[] = useMemo(processActionData, [processActionData]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {actionData.map(action => (
                    <div
                        key={action.action}
                        className="bg-[var(--color-surfaceHover)]/50 p-3 rounded-md border border-[var(--color-border)]"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className="text-sm font-medium text-[var(--color-text)] capitalize">{action.action} Actions</h4>
                                <p className="text-xs text-[var(--color-textSecondary)]">{action.description}</p>
                            </div>
                            <div className="bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-full text-[var(--color-accent)] font-medium text-xs whitespace-nowrap">
                                {action.totalXP.toLocaleString()} XP
                            </div>
                        </div>
                        <div className="mt-1.5">
                            <div className="flex justify-between text-[10px] text-[var(--color-textSecondary)] mb-0.5">
                                <span>0%</span>
                                <span>{action.percentage.toFixed(1)}% of total</span>
                                <span>100%</span>
                            </div>
                            <div className="bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[var(--color-accent)]"
                                    style={{ width: `${action.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                <h4 className="text-sm font-semibold text-[var(--color-text)] mb-2">XP Values Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                        <h5 className="text-xs font-medium text-[var(--color-text)] mb-1 flex items-center">
                            <FileText className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                            Notes & Ideas
                        </h5>
                        <ul className="space-y-0.5 text-xs text-[var(--color-textSecondary)]">
                            <li className="flex justify-between">
                                <span>Create Note</span>
                                <span className="font-mono">+{XP_VALUES.CREATE_NOTE}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Create Idea</span>
                                <span className="font-mono">+{XP_VALUES.CREATE_IDEA}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Archive Note</span>
                                <span className="font-mono">+{XP_VALUES.ARCHIVE_NOTE}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Archive Idea</span>
                                <span className="font-mono">+{XP_VALUES.ARCHIVE_IDEA}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Update Content</span>
                                <span className="font-mono">+{XP_VALUES.UPDATE_CONTENT}</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-xs font-medium text-[var(--color-text)] mb-1 flex items-center">
                            <CheckSquare className="w-3.5 h-3.5 mr-1 text-green-600 dark:text-green-400" />
                            Tasks
                        </h5>
                        <ul className="space-y-0.5 text-xs text-[var(--color-textSecondary)]">
                            <li className="flex justify-between">
                                <span>Create Task</span>
                                <span className="font-mono">+{XP_VALUES.CREATE_TASK}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Complete Task</span>
                                <span className="font-mono">+{XP_VALUES.COMPLETE_TASK}</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-xs font-medium text-[var(--color-text)] mb-1 flex items-center">
                            <AlarmClock className="w-3.5 h-3.5 mr-1 text-yellow-600 dark:text-yellow-400" />
                            Reminders & Links
                        </h5>
                        <ul className="space-y-0.5 text-xs text-[var(--color-textSecondary)]">
                            <li className="flex justify-between">
                                <span>Create Reminder</span>
                                <span className="font-mono">+{XP_VALUES.CREATE_REMINDER}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Complete Reminder</span>
                                <span className="font-mono">+{XP_VALUES.COMPLETE_REMINDER}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Create Link</span>
                                <span className="font-mono">+{XP_VALUES.CREATE_LINK}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
} 