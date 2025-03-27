import { Task } from '../../../api/types/task';
import { StatValue } from '../../dashboardContextUtils';
import { CheckSquare, Clock, Calendar } from 'lucide-react';
import { createProgressionForValue, generateCumulativeData, isDataFlat, isDataBackLoaded } from '../utils/chartDataUtils';

/**
 * Handler for active tasks statistics
 */
export function getActiveTasksStatValue(tasks: Task[]): StatValue {
    const activeTasks = tasks.filter((task: Task) => task.status.toLowerCase() !== 'completed');
    const completedTasks = tasks.filter((task: Task) => task.status.toLowerCase() === 'completed');

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const dueSoonTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= threeDaysFromNow;
    }).length;

    // Generate activity data for active tasks - modified to show cumulative tasks over time
    let taskActivityData: number[] = [];
    let hasTaskActivityData = false;

    if (activeTasks.length > 0) {
        // Calculate actual data based on creation dates
        taskActivityData = generateCumulativeData(activeTasks, task => task.createdAt);

        // Check if the data is too flat (little variation)
        const isFlat = isDataFlat(taskActivityData);

        // If data is too flat, create an artificial progression for better visualization
        if (isFlat && activeTasks.length > 3) {
            taskActivityData = createProgressionForValue(activeTasks.length);
        }

        // Always show the graph if there are any active tasks
        hasTaskActivityData = activeTasks.length > 0;
    }

    return {
        value: activeTasks.length,
        timeframe: `of ${tasks.length} total`,
        description: 'Tasks currently in progress',
        additionalInfo: [
            {
                icon: Clock,
                value: `${dueSoonTasks} due soon`
            },
            {
                icon: CheckSquare,
                value: `${completedTasks.length} completed`
            }
        ],
        metadata: {
            breakdown: {
                total: tasks.length,
                created: activeTasks.length,
                edited: 0,
                deleted: 0
            },
            ...(hasTaskActivityData && { activityData: taskActivityData })
        }
    };
}

/**
 * Handler for completed tasks statistics
 */
export function getCompletedTasksStatValue(tasks: Task[]): StatValue {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedTasks = tasks.filter((task: Task) => task.status.toLowerCase() === 'completed');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const completedToday = completedTasks.filter(task => {
        const completedDate = new Date(task.updatedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
    }).length;

    const completedThisWeek = completedTasks.filter(task => {
        const completedDate = new Date(task.updatedAt);
        return completedDate >= weekAgo;
    }).length;

    // Generate activity data for completed tasks - modified to show cumulative completions over time
    let completedTaskActivityData: number[] = [];
    let hasCompletedTaskData = false;

    if (completedTasks.length > 0) {
        // First calculate the actual data based on completion dates
        completedTaskActivityData = generateCumulativeData(completedTasks, task => task.updatedAt);

        // Check if the data is too flat (all values concentrated at the end)
        const allValuesAtEnd = isDataBackLoaded(completedTaskActivityData);

        // If all completions are very recent, create an artificial progression
        if (allValuesAtEnd || completedTaskActivityData.every((val, i, arr) => i === 0 || val === arr[i - 1])) {
            completedTaskActivityData = createProgressionForValue(completedTasks.length);
        }

        // Always show the graph if there are any completed tasks
        hasCompletedTaskData = completedTasks.length > 0;
    }

    return {
        value: `${completedTasks.length} of ${tasks.length}`,
        timeframe: 'Total',
        description: 'Tasks marked as completed',
        additionalInfo: [
            {
                icon: Clock,
                value: `${completedToday} today`
            },
            {
                icon: Calendar,
                value: `${completedThisWeek} this week`
            }
        ],
        metadata: {
            breakdown: {
                total: tasks.length,
                created: completedThisWeek,
                edited: 0,
                deleted: 0
            },
            activityData: hasCompletedTaskData ? completedTaskActivityData : undefined
        }
    };
} 