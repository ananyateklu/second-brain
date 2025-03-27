import { StatValue } from '../../dashboardContextUtils';
import { Clock, AlertCircle } from 'lucide-react';
import { generateDailyBreakdown } from '../utils/chartDataUtils';

// Since we don't have a type definition, defining a minimal interface
interface Reminder {
    isCompleted: boolean;
    dueDateTime: string;
    tags: string[];
}

/**
 * Handler for reminders statistics
 */
export function getRemindersStatValue(reminders: Reminder[]): StatValue {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeReminders = reminders.filter(reminder => !reminder.isCompleted);

    const upcomingReminders = activeReminders.filter(reminder => {
        const dueDate = new Date(reminder.dueDateTime);
        return dueDate >= today;
    });

    const overdue = activeReminders.filter(reminder => {
        const dueDate = new Date(reminder.dueDateTime);
        return dueDate < today;
    });

    // Generate activity data for reminders
    const reminderActivityData = generateDailyBreakdown(
        activeReminders,
        reminder => reminder.dueDateTime
    );

    const hasReminderActivityData = reminderActivityData.some(value => value > 0);

    return {
        value: activeReminders.length,
        timeframe: 'Active reminders',
        description: 'Upcoming and overdue reminders',
        additionalInfo: [
            {
                icon: Clock,
                value: `${upcomingReminders.length} upcoming`
            },
            {
                icon: AlertCircle,
                value: `${overdue.length} overdue`
            }
        ],
        metadata: {
            breakdown: {
                total: reminders.length,
                created: activeReminders.length,
                edited: 0,
                deleted: 0
            },
            ...(hasReminderActivityData && { activityData: reminderActivityData })
        }
    };
} 