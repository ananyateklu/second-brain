import { Note } from '../../types/note';
import { Task } from '../../types/task';
import { Activity } from '../../services/api/activities.service';
import { StatValue } from '../dashboardContextUtils';
import {
    getConnectionsStatValue,
    getConnectionTypesStatValue
} from './statsHandlers/connectionStatsHandler';
import {
    getDailyActivityStatValue
} from './statsHandlers/activityStatsHandler';
import {
    getTotalNotesStatValue,
    getNewNotesStatValue,
    getLastUpdateStatValue,
    getWordCountStatValue,
    getNotesStatsValue
} from './statsHandlers/noteStatsHandler';
import {
    getActiveTasksStatValue,
    getCompletedTasksStatValue,
    getTaskCompletionRateStatValue,
    getTasksDueSoonStatValue
} from './statsHandlers/taskStatsHandler';
import {
    getRemindersStatValue
} from './statsHandlers/reminderStatsHandler';
import {
    getCategoriesStatValue
} from './statsHandlers/categoryStatsHandler';
import {
    getIdeasCountStatValue
} from './statsHandlers/ideasStatsHandler';
import {
    getContentFreshnessStatValue
} from './statsHandlers/freshnessStatsHandler';

// Import the Reminder interface or redefine it here
interface Reminder {
    isCompleted: boolean;
    dueDateTime: string;
    tags: string[];
}

// Define the input data type for stat handlers
interface StatHandlerData {
    notes: Note[];
    tasks: Task[];
    reminders: Reminder[]; // Now using the Reminder interface
    activities: Activity[];
    isLoading: boolean;
}

// Define the stat handler type
type StatHandler = (data: StatHandlerData) => StatValue;

// Registry mapping stat IDs to their handler functions
const statsRegistry: Record<string, StatHandler> = {
    'connections': ({ notes }) => getConnectionsStatValue(notes),
    'connection-types': ({ notes }) => getConnectionTypesStatValue(notes),
    'categories': ({ notes, tasks, reminders }) => getCategoriesStatValue(notes, tasks, reminders),
    'daily-activity': ({ activities }) => getDailyActivityStatValue(activities),
    'total-notes': ({ notes }) => getTotalNotesStatValue(notes),
    'total-notes-v2': ({ notes }) => getTotalNotesStatValue(notes), // Alias for backwards compatibility
    'new-notes': ({ notes }) => getNewNotesStatValue(notes),
    'last-update': ({ notes }) => getLastUpdateStatValue(notes),
    'word-count': ({ notes }) => getWordCountStatValue(notes),
    'notes-stats': ({ notes }) => getNotesStatsValue(notes),
    'ideas-count': ({ notes }) => getIdeasCountStatValue(notes),
    'active-tasks': ({ tasks }) => getActiveTasksStatValue(tasks),
    'completed-tasks': ({ tasks }) => getCompletedTasksStatValue(tasks),
    'completed': ({ tasks }) => getCompletedTasksStatValue(tasks), // Alias for backwards compatibility
    'reminders': ({ reminders }) => getRemindersStatValue(reminders),
    'content-freshness': ({ notes }) => getContentFreshnessStatValue(notes),
    'task-completion-rate': ({ tasks }) => getTaskCompletionRateStatValue(tasks),
    'tasks-due-soon': ({ tasks }) => getTasksDueSoonStatValue(tasks),
};

/**
 * Get a stat value by ID
 * @param statId The ID of the stat to get
 * @param data The data needed for calculation
 * @returns The calculated stat value or a placeholder if loading
 */
export function getStatById(statId: string, data: StatHandlerData): StatValue {
    // If still loading, return placeholder values
    if (data.isLoading) {
        return {
            value: '-',
            timeframe: 'Loading...'
        };
    }

    // Check if we have a handler for this stat ID
    const handler = statsRegistry[statId];
    if (!handler) {
        console.warn(`No handler found for stat ID: ${statId}`);
        return {
            value: 'N/A',
            timeframe: 'Unknown stat',
            description: `No handler for "${statId}"`
        };
    }

    try {
        return handler(data);
    } catch (error) {
        console.error(`Error calculating stat "${statId}":`, error);
        return {
            value: 'Error',
            timeframe: 'Calculation failed',
            description: 'An error occurred'
        };
    }
}

/**
 * Registers a new stat handler
 * @param statId The ID of the stat
 * @param handler The handler function
 */
export function registerStatHandler(statId: string, handler: StatHandler): void {
    statsRegistry[statId] = handler;
}

/**
 * Checks if a handler exists for the given stat ID
 * @param statId The ID of the stat to check
 * @returns True if a handler exists, false otherwise
 */
export function hasStatHandler(statId: string): boolean {
    return statId in statsRegistry;
} 