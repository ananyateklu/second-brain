import { Bell, Clock, Check, X } from 'lucide-react';
import { Reminder as ReminderType } from '../../../../contexts/remindersContextUtils'; // For Reminder type from context
import { formatDistanceStrict } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState } from 'react';
import { useTheme } from '../../../../contexts/themeContextUtils';

// Re-using LinkedReminder type for simplicity, assuming it just needs id and title for display in some contexts
// If specific idea-related reminder fields are needed, this might need adjustment.
interface LinkedReminderDisplay {
    id: string;
    title: string;
    // Add other fields from ReminderType if needed by MiniReminderCard
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed?: boolean; // Optional as it's not in LinkedReminder from note.ts
    createdAt?: string; // Optional
    updatedAt?: string; // Optional
}

interface MiniReminderCardProps {
    reminder: ReminderType; // Use full ReminderType from context
    onUnlink?: (reminderId: string) => void;
    onClick: () => void;
    consistentBorderColor: string; // Passed from parent
}

function MiniReminderCard({ reminder, onUnlink, onClick, consistentBorderColor }: MiniReminderCardProps) {

    return (
        <div
            onClick={onClick}
            className={`relative flex items-center gap-1.5 p-1.5 bg-[var(--color-surface)] rounded-lg border ${consistentBorderColor} group hover:bg-[var(--color-surfaceHover)] transition-colors cursor-pointer`}
        >
            <div className="shrink-0 p-1 bg-[var(--color-surface)] rounded-lg">
                <Bell className="w-3 h-3 text-purple-500" />
            </div>

            <div className="min-w-0 max-w-[180px]">
                <h6 className="text-xs font-medium text-[var(--color-text)] truncate">
                    {reminder.title}
                </h6>
                <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 text-xs text-[var(--color-textSecondary)]">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceStrict(new Date(reminder.dueDateTime), new Date(), { addSuffix: true })}
                    </span>
                    {reminder.isCompleted && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-xs font-medium bg-green-900/20 text-green-400 rounded">
                            <Check className="w-2.5 h-2.5" />
                        </span>
                    )}
                </div>
            </div>

            {onUnlink && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUnlink(reminder.id);
                    }}
                    className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-[var(--color-surface)] text-purple-500 hover:text-purple-600 hover:bg-[var(--color-surfaceHover)] rounded-full border ${consistentBorderColor} transition-all z-10`}
                >
                    <X className="w-2.5 h-2.5" />
                </button>
            )}
        </div>
    );
}

interface LinkedRemindersPanelProps {
    // Use the simplified display type for linked reminders passed in
    reminders: LinkedReminderDisplay[];
    onUnlink?: (reminderId: string) => void;
}

export function LinkedRemindersPanel({
    reminders,
    onUnlink,
}: LinkedRemindersPanelProps) {
    const { reminders: allRemindersFromContext } = useReminders(); // Renamed to avoid conflict
    const { theme } = useTheme();
    const [selectedReminder, setSelectedReminder] = useState<ReminderType | null>(null);

    const consistentBorderColor = (() => {
        switch (theme) {
            case 'midnight':
                return 'border-white/10';
            case 'dark':
                return 'border-gray-700/30';
            case 'full-dark':
                return 'border-white/10';
            case 'light':
            default:
                return 'border-[var(--color-border)]';
        }
    })();

    const getContainerBackground = () => {
        // This function is used for the panel background itself, not individual cards.
        // Keeping its logic separate for clarity or if panel needs different styling later.
        if (theme === 'dark') return 'bg-[#111827]';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-[var(--color-surface)]';
    };

    const displayableReminders = reminders.map(linkedReminder => {
        return allRemindersFromContext.find(r => r.id === linkedReminder.id);
    }).filter(Boolean) as ReminderType[];

    if (displayableReminders.length === 0) {
        return (
            <div className={`p-3 rounded-lg text-center text-xs text-[var(--color-textSecondary)] ${getContainerBackground()}`}>
                No reminders linked to this idea yet.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className={`p-2 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-2 ${getContainerBackground()}`}>
                {displayableReminders.map((reminder) => (
                    <MiniReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onUnlink={onUnlink}
                        onClick={() => setSelectedReminder(reminder)}
                        consistentBorderColor={consistentBorderColor}
                    />
                ))}
            </div>

            {selectedReminder && (
                <EditReminderModal
                    reminder={selectedReminder}
                    isOpen={!!selectedReminder}
                    onClose={() => setSelectedReminder(null)}
                />
            )}
        </div>
    );
} 