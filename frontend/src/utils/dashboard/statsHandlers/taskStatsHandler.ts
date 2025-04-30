import { Task } from '../../../types/task';
import { StatValue } from '../../dashboardContextUtils';
import { CheckSquare, Clock, Calendar, AlertTriangle } from 'lucide-react';
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

/**
 * Handler for task completion rate statistics
 */
export function getTaskCompletionRateStatValue(tasks: Task[]): StatValue {
    if (!tasks || tasks.length === 0) {
        return {
            value: '0%',
            timeframe: 'No tasks yet',
            description: 'Create tasks to track completion rate',
            metadata: {
                breakdown: {
                    total: 0,
                    created: 0,
                    edited: 0,
                    deleted: 0
                }
            }
        };
    }

    const completedTasks = tasks.filter(task => task.status.toLowerCase() === 'completed');
    const activeTasks = tasks.filter(task => task.status.toLowerCase() !== 'completed');

    const totalTasks = tasks.length;
    const completionRate = Math.round((completedTasks.length / totalTasks) * 100);

    // Get tasks completed this week
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const completedThisWeek = completedTasks.filter(task => {
        const completedDate = new Date(task.updatedAt);
        return completedDate >= weekAgo;
    });

    // Get tasks with upcoming due dates
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const dueSoonTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= tomorrow;
    });

    // Calculate weekly change in completion rate
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);

    const tasksCompletedLastWeek = completedTasks.filter(task => {
        const completedDate = new Date(task.updatedAt);
        return completedDate >= twoWeeksAgo && completedDate < weekAgo;
    });

    // Calculate previous completion rate if there were tasks last week
    const previousCompletionRate = tasksCompletedLastWeek.length > 0 ?
        Math.round((tasksCompletedLastWeek.length / (tasksCompletedLastWeek.length + activeTasks.length)) * 100) : 0;

    const completionRateChange = completionRate - previousCompletionRate;

    // Generate data for visualization
    let activityData = [];

    if (totalTasks > 0) {
        // Create an array representing the last 7 days of task completion
        activityData = Array(7).fill(0);

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);

            const dayCompleted = completedTasks.filter(task => {
                const completedDate = new Date(task.updatedAt);
                completedDate.setHours(0, 0, 0, 0);
                return completedDate.getTime() === date.getTime();
            }).length;

            activityData[i] = dayCompleted;
        }
    }

    // If no tasks were completed in the last 7 days, create a simulated progression
    if (!activityData.some(value => value > 0) && completedTasks.length > 0) {
        activityData = createProgressionForValue(completedTasks.length);
    }

    return {
        value: `${completionRate}%`,
        change: completionRateChange,
        timeframe: 'Overall completion',
        description: 'Percentage of tasks completed',
        additionalInfo: [
            {
                icon: CheckSquare,
                value: `${completedThisWeek.length} completed this week`
            },
            {
                icon: Calendar,
                value: `${dueSoonTasks.length} due soon`
            },
            {
                icon: Clock,
                value: `${activeTasks.length} active tasks`
            }
        ],
        metadata: {
            breakdown: {
                total: totalTasks,
                created: activeTasks.length,
                edited: 0,
                deleted: completedTasks.length
            },
            activityData: activityData
        },
        topBreakdown: {
            active: activeTasks.length,
            archived: completedTasks.length
        }
    };
}

/**
 * Handler for tasks due soon statistics
 * Shows tasks with upcoming deadlines to help prioritize work
 */
export function getTasksDueSoonStatValue(tasks: Task[]): StatValue {
    if (!tasks || tasks.length === 0) {
        return {
            value: '0',
            timeframe: 'No tasks yet',
            description: 'Create tasks with due dates to track deadlines',
            metadata: {
                breakdown: {
                    total: 0,
                    created: 0,
                    edited: 0,
                    deleted: 0
                }
            }
        };
    }

    const activeTasks = tasks.filter(task => task.status.toLowerCase() !== 'completed');

    // Get current date
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Define time ranges
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Find tasks due within different time frames
    const dueTodayTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === now.getTime();
    });

    const dueTomorrowTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
    });

    const dueThisWeekTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate > tomorrow && dueDate <= nextWeek;
    });

    // Find overdue tasks
    const overdueTasks = activeTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
    });

    // Total tasks with due dates
    const totalTasksWithDueDates = activeTasks.filter(task => task.dueDate).length;

    // Count tasks due soon (today + tomorrow)
    const dueSoonCount = dueTodayTasks.length + dueTomorrowTasks.length;

    // Generate data for visualization
    // Create an array showing tasks grouped by how soon they are due
    const activityData = [
        overdueTasks.length,         // Overdue
        dueTodayTasks.length,        // Due today
        dueTomorrowTasks.length,     // Due tomorrow
        dueThisWeekTasks.length,     // Due this week
        0,                           // Placeholder
        0,                           // Placeholder
        0                            // Placeholder
    ];

    // If there's no activity data, create a simulated progression
    if (!activityData.slice(0, 4).some(value => value > 0) && totalTasksWithDueDates > 0) {
        return {
            value: '0',
            timeframe: 'No urgent deadlines',
            description: 'No tasks due within the next week',
            metadata: {
                breakdown: {
                    total: totalTasksWithDueDates,
                    created: 0,
                    edited: 0,
                    deleted: 0
                }
            }
        };
    }

    // Create better visualization with artificial progression if we have data
    if (activityData.slice(0, 4).some(value => value > 0)) {
        // Distribute the remaining days with a decreasing pattern
        activityData[4] = Math.max(0, Math.floor(dueThisWeekTasks.length * 0.7));
        activityData[5] = Math.max(0, Math.floor(dueThisWeekTasks.length * 0.4));
        activityData[6] = Math.max(0, Math.floor(dueThisWeekTasks.length * 0.2));
    }

    // Determine the main value to display and timeframe
    let value, timeframe, description;

    if (overdueTasks.length > 0) {
        value = overdueTasks.length.toString();
        timeframe = `${dueSoonCount} due soon`;
        description = 'Tasks past their due date';
    } else if (dueTodayTasks.length > 0) {
        value = dueTodayTasks.length.toString();
        timeframe = `${dueTomorrowTasks.length} tomorrow`;
        description = 'Tasks due today';
    } else if (dueTomorrowTasks.length > 0) {
        value = dueTomorrowTasks.length.toString();
        timeframe = `${dueThisWeekTasks.length} this week`;
        description = 'Tasks due tomorrow';
    } else if (dueThisWeekTasks.length > 0) {
        value = dueThisWeekTasks.length.toString();
        timeframe = 'due this week';
        description = 'Tasks due within 7 days';
    } else {
        value = '0';
        timeframe = 'No urgent deadlines';
        description = 'No tasks due soon';
    }

    return {
        value,
        timeframe,
        description,
        additionalInfo: [
            {
                icon: AlertTriangle,
                value: `${overdueTasks.length} overdue`
            },
            {
                icon: Clock,
                value: `${dueTodayTasks.length} due today`
            },
            {
                icon: Calendar,
                value: `${dueThisWeekTasks.length} this week`
            }
        ],
        metadata: {
            breakdown: {
                total: totalTasksWithDueDates,
                created: overdueTasks.length,  // Overdue
                edited: dueTodayTasks.length + dueTomorrowTasks.length,  // Due soon (today + tomorrow)
                deleted: dueThisWeekTasks.length  // Due this week
            },
            activityData
        },
        topBreakdown: {
            active: dueTodayTasks.length + dueTomorrowTasks.length + dueThisWeekTasks.length,
            archived: overdueTasks.length
        }
    };
} 